"""Admin CRUD for notification templates, schedules, and scheduled reports."""
from __future__ import annotations

from django.utils import timezone
from django.utils.text import slugify
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .channel_dispatch import broadcast_to_role, channel_status
from .schedule_models import NotificationTemplate, ScheduledNotification, ScheduledReport


def _parse_dt(value):
    if not value:
        return None
    from django.utils.dateparse import parse_datetime

    dt = parse_datetime(str(value).replace('Z', '+00:00'))
    if dt and timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


class ChannelStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(channel_status())


class NotificationTemplateListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = NotificationTemplate.objects.all().order_by('slug')
        data = [
            {
                'id': str(r.id),
                'slug': r.slug,
                'title': r.title,
                'body': r.body,
                'notification_type': r.notification_type,
                'channels': r.channels or ['system'],
                'is_active': r.is_active,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
        return success_response(data)

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        body = (request.data.get('body') or request.data.get('message') or '').strip()
        if not title or not body:
            return error_response('title and body are required', status_code=400)
        slug = (request.data.get('slug') or '').strip() or slugify(title)[:80]
        channels = request.data.get('channels') or ['system']
        if isinstance(channels, str):
            channels = [c.strip() for c in channels.split(',') if c.strip()]
        obj, _ = NotificationTemplate.objects.update_or_create(
            slug=slug,
            defaults={
                'title': title,
                'body': body,
                'notification_type': (request.data.get('notification_type') or 'system'),
                'channels': channels,
                'is_active': bool(request.data.get('is_active', True)),
                'created_by': request.user,
            },
        )
        return success_response({'id': str(obj.id), 'slug': obj.slug}, message='Template saved')


class NotificationTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        n, _ = NotificationTemplate.objects.filter(pk=pk).delete()
        if not n:
            return error_response('Not found', status_code=404)
        return success_response({'deleted': n})


class ScheduledNotificationListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = ScheduledNotification.objects.select_related('template').all()
        data = [
            {
                'id': str(r.id),
                'name': r.name,
                'title': r.title or (r.template.title if r.template else ''),
                'message': r.message or (r.template.body if r.template else ''),
                'recipient_role': r.recipient_role,
                'channels': r.channels or ['system'],
                'frequency': r.frequency,
                'run_at': r.run_at.isoformat() if r.run_at else None,
                'enabled': r.enabled,
                'last_run_at': r.last_run_at.isoformat() if r.last_run_at else None,
                'last_status': r.last_status,
                'template_id': str(r.template_id) if r.template_id else None,
            }
            for r in rows
        ]
        return success_response(data)

    def post(self, request):
        name = (request.data.get('name') or '').strip() or 'Scheduled notification'
        run_at = _parse_dt(request.data.get('run_at')) or timezone.now()
        channels = request.data.get('channels') or ['system']
        if isinstance(channels, str):
            channels = [c.strip() for c in channels.split(',') if c.strip()]
        template = None
        tid = request.data.get('template_id')
        if tid:
            template = NotificationTemplate.objects.filter(pk=tid).first()
        obj = ScheduledNotification.objects.create(
            name=name,
            template=template,
            title=(request.data.get('title') or '').strip(),
            message=(request.data.get('message') or '').strip(),
            recipient_role=(request.data.get('recipient_role') or 'all'),
            channels=channels,
            frequency=(request.data.get('frequency') or 'once'),
            run_at=run_at,
            enabled=bool(request.data.get('enabled', True)),
            created_by=request.user,
        )
        return success_response({'id': str(obj.id)}, message='Schedule created')


class ScheduledNotificationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        obj = ScheduledNotification.objects.filter(pk=pk).first()
        if not obj:
            return error_response('Not found', status_code=404)
        for field in ('name', 'title', 'message', 'recipient_role', 'frequency'):
            if field in request.data:
                setattr(obj, field, request.data.get(field))
        if 'enabled' in request.data:
            obj.enabled = bool(request.data.get('enabled'))
        if 'channels' in request.data:
            ch = request.data.get('channels') or ['system']
            obj.channels = ch if isinstance(ch, list) else [c.strip() for c in str(ch).split(',') if c.strip()]
        if 'run_at' in request.data:
            dt = _parse_dt(request.data.get('run_at'))
            if dt:
                obj.run_at = dt
        obj.save()
        return success_response({'id': str(obj.id)}, message='Updated')

    def delete(self, request, pk):
        n, _ = ScheduledNotification.objects.filter(pk=pk).delete()
        if not n:
            return error_response('Not found', status_code=404)
        return success_response({'deleted': n})


class ScheduledReportListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = ScheduledReport.objects.all()
        data = [
            {
                'id': str(r.id),
                'name': r.name,
                'report_type': r.report_type,
                'export_format': r.export_format,
                'frequency': r.frequency,
                'recipient_emails': r.recipient_emails or [],
                'run_at': r.run_at.isoformat() if r.run_at else None,
                'enabled': r.enabled,
                'last_run_at': r.last_run_at.isoformat() if r.last_run_at else None,
                'last_status': r.last_status,
            }
            for r in rows
        ]
        return success_response(data)

    def post(self, request):
        name = (request.data.get('name') or '').strip() or 'Scheduled report'
        run_at = _parse_dt(request.data.get('run_at')) or timezone.now()
        emails = request.data.get('recipient_emails') or []
        if isinstance(emails, str):
            emails = [e.strip() for e in emails.split(',') if e.strip()]
        obj = ScheduledReport.objects.create(
            name=name,
            report_type=(request.data.get('report_type') or 'enforcement_summary'),
            export_format=(request.data.get('export_format') or 'pdf'),
            frequency=(request.data.get('frequency') or 'daily'),
            recipient_emails=emails,
            run_at=run_at,
            enabled=bool(request.data.get('enabled', True)),
            created_by=request.user,
        )
        return success_response({'id': str(obj.id)}, message='Report schedule created')


class ScheduledReportDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        n, _ = ScheduledReport.objects.filter(pk=pk).delete()
        if not n:
            return error_response('Not found', status_code=404)
        return success_response({'deleted': n})


class RunDueSchedulesView(APIView):
    """Manual trigger (also called by Celery beat)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from notifications.channel_dispatch import (
            process_due_scheduled_notifications,
            process_due_scheduled_reports,
        )

        notif = process_due_scheduled_notifications()
        reports = process_due_scheduled_reports()
        return success_response({'notifications': notif, 'reports': reports})
