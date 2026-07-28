"""Notification dispatch — Celery async with synchronous fallback."""
from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from notifications.models import Notification

logger = logging.getLogger(__name__)
User = get_user_model()


def _resolve_user(user_or_id):
    if isinstance(user_or_id, User):
        return user_or_id
    return User.objects.filter(pk=user_or_id).first()


def dispatch_notification(
    user,
    title: str,
    message: str,
    notification_type: str = 'system',
    *,
    async_dispatch: bool = True,
    fine_id=None,
    link_url: str = '',
) -> bool:
    """Queue in-app notification via Celery, or write synchronously if broker unavailable."""
    resolved = _resolve_user(user)
    if not resolved:
        logger.warning('Notification skipped — user not found: %s', user)
        return False

    # fine_id / link_url require sync create (Celery task payload is title/message/type only).
    needs_extra = fine_id is not None or bool(link_url)
    if async_dispatch and not needs_extra and getattr(settings, 'USE_REDIS', False):
        try:
            from core.tasks import send_notification_task

            send_notification_task.delay(str(resolved.pk), title, message, notification_type)
            return True
        except Exception as exc:
            logger.warning('Celery unavailable, sync notification fallback: %s', exc)

    Notification.objects.create(
        user=resolved,
        title=title,
        message=message,
        type=notification_type,
        fine_id=fine_id,
        link_url=link_url or '',
    )
    return True


def notify_driver_violation(driver, violation) -> bool:
    """Notify driver when a violation record is created from AI enforcement."""
    user = getattr(driver, 'user', None)
    if not user:
        return False
    vtype = getattr(violation, 'violation_type', 'Violation') or 'Violation'
    location = getattr(violation, 'location', '') or 'Unknown location'
    return dispatch_notification(
        user,
        title='Traffic Violation Recorded',
        message=f'{vtype} detected at {location}. Status: pending officer review.',
        notification_type='violation',
    )


def notify_driver_fine(user, fine) -> bool:
    """Notify driver when a fine is issued."""
    return dispatch_notification(
        user,
        title='New Fine Issued',
        message=f'A fine of ${fine.amount} USD has been issued for: {fine.reason}.',
        notification_type='fine',
    )


def notify_driver_payment_result(user, fine, *, approved: bool) -> bool:
    """Notify driver when officer verifies or rejects payment proof."""
    if approved:
        return dispatch_notification(
            user,
            title='Payment Confirmed',
            message=f'Your payment for fine #{fine.id} ({fine.amount} USD) was verified. Case closed.',
            notification_type='payment',
            fine_id=getattr(fine, 'id', None),
            link_url='/fines',
        )
    return dispatch_notification(
        user,
        title='Payment Rejected',
        message=f'Payment proof for fine #{fine.id} was rejected. Please pay again or submit an appeal.',
        notification_type='payment',
        fine_id=getattr(fine, 'id', None),
        link_url='/fines',
    )


def notify_staff_payment_success(fine) -> int:
    """
    Alert admins and officers when a driver payment succeeds.

    Recipients:
    - All active admin users
    - Issuing officer (fine.police) when set
    - If no issuing officer: all active police officers
    """
    driver = getattr(fine, 'driver', None)
    driver_name = (
        getattr(driver, 'full_name', None)
        or getattr(driver, 'email', None)
        or 'Driver'
    )
    plate = (getattr(fine, 'vehicle_plate', None) or '').strip() or 'N/A'
    method = (getattr(fine, 'payment_method', None) or '').strip() or 'online'
    amount = getattr(fine, 'amount', None)
    title = 'Fine Payment Received'
    message = (
        f'{driver_name} paid fine #{fine.id} — ${amount} USD '
        f'(plate {plate}, method {method}).'
    )

    recipients: dict[str, object] = {}
    for admin in User.objects.filter(is_active=True, role='admin').iterator():
        recipients[str(admin.pk)] = admin

    issuing = getattr(fine, 'police', None)
    if issuing and getattr(issuing, 'is_active', True):
        recipients[str(issuing.pk)] = issuing
    else:
        for officer in User.objects.filter(is_active=True, role='police').iterator():
            recipients[str(officer.pk)] = officer

    # Never notify the paying driver as "staff".
    if driver is not None:
        recipients.pop(str(getattr(driver, 'pk', '')), None)

    sent = 0
    for user in recipients.values():
        link = '/admin/fines' if getattr(user, 'role', '') == 'admin' else '/fines'
        try:
            if dispatch_notification(
                user,
                title=title,
                message=message,
                notification_type='payment',
                async_dispatch=False,
                fine_id=getattr(fine, 'id', None),
                link_url=link,
            ):
                sent += 1
        except Exception:
            logger.exception('Staff payment notify failed for user=%s fine=%s', getattr(user, 'pk', None), fine.pk)
    return sent


def notify_officer_detection(user, title: str, message: str, *, is_violation: bool = False) -> bool:
    return dispatch_notification(
        user,
        title=title,
        message=message,
        notification_type='violation' if is_violation else 'detection',
    )


def notify_driver_appeal_decision(appeal) -> bool:
    """Notify driver when police approve (dismissed) or reject (upheld) an appeal."""
    driver_profile = getattr(appeal, 'driver', None)
    user = getattr(driver_profile, 'user', None) if driver_profile is not None else None
    if not user:
        logger.warning('Appeal notification skipped — no driver user on appeal %s', getattr(appeal, 'pk', None))
        return False

    status = (getattr(appeal, 'status', '') or '').lower()
    # Convention: dismissed = appeal granted (fine waived); upheld = appeal rejected (fine remains).
    if status == 'dismissed':
        title = 'Appeal Approved'
        message = (
            (getattr(appeal, 'officer_comments', None) or '').strip()
            or 'Your appeal was approved. The related fine has been cancelled.'
        )
    elif status == 'upheld':
        title = 'Appeal Rejected'
        message = (
            (getattr(appeal, 'officer_comments', None) or '').strip()
            or 'Your appeal was rejected. The fine remains active and payable.'
        )
    else:
        title = 'Appeal Updated'
        message = (
            (getattr(appeal, 'officer_comments', None) or '').strip()
            or f'Your appeal status is now: {status or "updated"}.'
        )

    ok = dispatch_notification(
        user,
        title=title,
        message=message,
        notification_type='appeal',
    )
    # Best-effort channel fan-out (SMS / push) when configured.
    try:
        from notifications.sms_service import notify_appeal_decided_sms
        notify_appeal_decided_sms(user, appeal)
    except Exception:
        pass
    try:
        from notifications.push_service import notify_appeal_decided_push
        notify_appeal_decided_push(user, appeal)
    except Exception:
        pass
    return ok
