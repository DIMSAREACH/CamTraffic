"""Multi-channel dispatch + schedule runners."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()

ROLE_MAP = {
    'driver': 'driver',
    'officer': 'police',
    'police': 'police',
    'admin': 'admin',
    'all': None,
}


def email_configured() -> bool:
    try:
        from authentication.resend_email import resend_configured
        if resend_configured():
            return True
    except Exception:
        pass
    return bool(
        getattr(settings, 'EMAIL_HOST_USER', None)
        or getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        or (
            getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            and getattr(settings, 'EMAIL_HOST', None)
        )
    )


def channel_status() -> dict:
    from notifications.push_service import fcm_enabled, web_push_enabled
    from notifications.sms_service import sms_enabled

    return {
        'system': True,
        'email': email_configured(),
        'push': fcm_enabled() or web_push_enabled(),
        'sms': sms_enabled(),
    }


def _users_for_role(recipient: str) -> list:
    role = ROLE_MAP.get((recipient or 'all').lower(), None if recipient == 'all' else recipient)
    qs = User.objects.filter(is_active=True)
    if role:
        qs = qs.filter(role=role)
    return list(qs[:2000])


def send_email_to_user(user, title: str, message: str) -> dict:
    to = (getattr(user, 'email', '') or '').strip()
    if not to:
        return {'success': False, 'error': 'no_email'}
    if not email_configured():
        return {'success': False, 'error': 'email_not_configured', 'configured': False}

    subject = title[:200]
    text = message or ''
    html = f'<p>{text.replace(chr(10), "<br/>")}</p>'

    try:
        from authentication.resend_email import resend_configured, send_resend_email
        if resend_configured():
            ok, err = send_resend_email(to=to, subject=subject, html=html, text=text)
            if ok:
                return {'success': True, 'to': to, 'provider': 'resend'}
            return {'success': False, 'error': err or 'resend_failed', 'provider': 'resend'}
    except Exception as exc:
        logger.warning('Resend path failed for %s: %s', to, exc)

    try:
        send_mail(
            subject=subject,
            message=text,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or None,
            recipient_list=[to],
            fail_silently=False,
        )
        return {'success': True, 'to': to, 'provider': 'smtp'}
    except Exception as exc:
        logger.warning('Email send failed for %s: %s', to, exc)
        return {'success': False, 'error': str(exc)}


def dispatch_channels(
    user,
    title: str,
    message: str,
    notification_type: str = 'system',
    channels: list[str] | None = None,
) -> dict:
    """Send in-app + optional email/push/SMS. Always attempts system if listed or empty."""
    from notifications.services import dispatch_notification
    from notifications.push_service import PushNotificationService
    from notifications.sms_service import SMSService

    channels = [c.lower() for c in (channels or ['system'])]
    if 'system' not in channels:
        channels = ['system', *channels]

    result = {
        'system': False,
        'email': None,
        'push': None,
        'sms': None,
    }

    if 'system' in channels:
        result['system'] = bool(
            dispatch_notification(user, title, message, notification_type, async_dispatch=False)
        )

    if 'email' in channels:
        result['email'] = send_email_to_user(user, title, message)

    if 'push' in channels:
        try:
            result['push'] = PushNotificationService().send_to_user(
                user, title, message, notification_type=notification_type
            )
        except Exception as exc:
            result['push'] = {'success': False, 'error': str(exc)}

    if 'sms' in channels:
        phone = (getattr(user, 'phone', '') or '').strip()
        if phone and not phone.startswith('+') and phone.isdigit():
            phone = f'+855{phone.lstrip("0")}'
        try:
            result['sms'] = SMSService().send_sms(
                to_number=phone,
                message=f'{title}: {message}'[:160],
                user=user,
                notification_type=notification_type,
            )
        except Exception as exc:
            result['sms'] = {'success': False, 'error': str(exc)}

    return result


def broadcast_to_role(
    *,
    title: str,
    message: str,
    notification_type: str = 'system',
    recipient: str = 'all',
    channels: list[str] | None = None,
) -> dict:
    users = _users_for_role(recipient)
    created = 0
    email_ok = push_ok = sms_ok = 0
    for user in users:
        r = dispatch_channels(user, title, message, notification_type, channels)
        if r.get('system'):
            created += 1
        if isinstance(r.get('email'), dict) and r['email'].get('success'):
            email_ok += 1
        if isinstance(r.get('push'), dict) and (r['push'].get('success') or r['push'].get('total_sent', 0) > 0):
            push_ok += 1
        if isinstance(r.get('sms'), dict) and r['sms'].get('success'):
            sms_ok += 1

    status = channel_status()
    return {
        'created': created,
        'recipient': recipient,
        'channels': channels or ['system'],
        'email_sent': email_ok,
        'push_sent': push_ok,
        'sms_sent': sms_ok,
        'channel_status': status,
        'note': (
            'In-app always written when system channel selected. '
            f"Email configured={status['email']}, push={status['push']}, sms={status['sms']}."
        ),
    }


def _advance_run_at(dt, frequency: str):
    if frequency == 'hourly':
        return dt + timedelta(hours=1)
    if frequency == 'daily':
        return dt + timedelta(days=1)
    if frequency == 'weekly':
        return dt + timedelta(weeks=1)
    if frequency == 'monthly':
        return dt + timedelta(days=30)
    return None  # once


def process_due_scheduled_notifications(limit: int = 50) -> dict:
    from notifications.schedule_models import ScheduledNotification

    now = timezone.now()
    due = list(
        ScheduledNotification.objects.filter(enabled=True, run_at__lte=now)
        .select_related('template')
        .order_by('run_at')[:limit]
    )
    processed = 0
    for job in due:
        title = (job.title or (job.template.title if job.template else '')).strip()
        message = (job.message or (job.template.body if job.template else '')).strip()
        channels = job.channels or (job.template.channels if job.template else ['system']) or ['system']
        ntype = (job.template.notification_type if job.template else 'system') or 'system'
        if not title or not message:
            job.last_status = 'skipped_empty'
            job.last_run_at = now
            job.save(update_fields=['last_status', 'last_run_at'])
            continue
        out = broadcast_to_role(
            title=title,
            message=message,
            notification_type=ntype,
            recipient=job.recipient_role,
            channels=channels,
        )
        job.last_run_at = now
        job.last_status = f"ok:{out.get('created', 0)}"
        nxt = _advance_run_at(job.run_at, job.frequency)
        if nxt is None:
            job.enabled = False
        else:
            job.run_at = nxt
        job.save()
        processed += 1
    return {'processed': processed, 'due': len(due)}


def process_due_scheduled_reports(limit: int = 20) -> dict:
    """Generate summary and email recipients when SMTP configured."""
    from django.db.models import Count, Sum

    from fines.models import Fine
    from notifications.schedule_models import ScheduledReport
    from violations.models import TrafficViolation

    now = timezone.now()
    due = list(ScheduledReport.objects.filter(enabled=True, run_at__lte=now).order_by('run_at')[:limit])
    processed = 0
    for job in due:
        fines = Fine.objects.all()
        violations = TrafficViolation.objects.all()
        summary = (
            f"CamTraffic {job.report_type} ({job.export_format})\n"
            f"Generated: {now.isoformat()}\n"
            f"Violations: {violations.count()}\n"
            f"Fines: {fines.count()}\n"
            f"Paid: {fines.filter(status='paid').count()}\n"
            f"Revenue USD: {fines.filter(status='paid').aggregate(s=Sum('amount'))['s'] or 0}\n"
        )
        emails = [e for e in (job.recipient_emails or []) if isinstance(e, str) and '@' in e]
        sent = 0
        if emails and email_configured():
            try:
                send_mail(
                    subject=f'[CamTraffic] {job.name}',
                    message=summary,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or None,
                    recipient_list=emails,
                    fail_silently=False,
                )
                sent = len(emails)
            except Exception as exc:
                logger.warning('Scheduled report email failed: %s', exc)
                job.last_status = f'email_fail:{exc}'
                job.last_run_at = now
                job.save(update_fields=['last_status', 'last_run_at'])
                continue

        job.last_run_at = now
        job.last_status = f'ok:emails={sent}'
        nxt = _advance_run_at(job.run_at, job.frequency)
        if nxt is None:
            job.enabled = False
        else:
            job.run_at = nxt
        job.save()
        processed += 1
    return {'processed': processed, 'due': len(due)}
