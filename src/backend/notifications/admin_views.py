"""Admin notification broadcast & inbox APIs (production — no catalog/demo)."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .models import Notification
from .serializers import NotificationSerializer
from .services import dispatch_notification

User = get_user_model()

ROLE_MAP = {
    'driver': 'driver',
    'officer': 'police',
    'police': 'police',
    'admin': 'admin',
    'all': None,
}


class AdminNotificationBroadcastView(APIView):
    """POST /api/notifications/admin/broadcast/ — create in-app notifications for a role group."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        notif_type = (request.data.get('type') or 'system').strip() or 'system'
        recipient = (request.data.get('recipient') or request.data.get('recipient_role') or 'all').strip().lower()
        channels = request.data.get('channels') or ['system']
        if isinstance(channels, str):
            channels = [c.strip() for c in channels.split(',') if c.strip()]

        if not title:
            return error_response('title is required', status_code=400)
        if not message:
            return error_response('message is required', status_code=400)
        if notif_type not in dict(Notification.TYPE_CHOICES):
            notif_type = 'system'

        role = ROLE_MAP.get(recipient, None if recipient == 'all' else recipient)
        qs = User.objects.filter(is_active=True)
        if role:
            qs = qs.filter(role=role)

        users = list(qs[:2000])
        if not users:
            return error_response('No active users match recipient filter', status_code=404)

        # In-app channel is always written; other channels are best-effort (push/SMS if configured)
        created = 0
        for user in users:
            if dispatch_notification(user, title, message, notif_type, async_dispatch=False):
                created += 1

        push_attempted = 'push' in channels
        sms_attempted = 'sms' in channels
        email_attempted = 'email' in channels

        return success_response(
            {
                'created': created,
                'recipient': recipient,
                'channels': channels,
                'push_attempted': push_attempted,
                'sms_attempted': sms_attempted,
                'email_attempted': email_attempted,
                'note': (
                    'In-app notifications created. '
                    'Push/SMS/email require configured providers (FCM/Twilio/SMTP).'
                ),
            },
            message=f'Sent {created} in-app notification(s)',
        )


class AdminNotificationListView(APIView):
    """GET /api/notifications/admin/ — all notifications (admin/officer oversight)."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        qs = Notification.objects.select_related('user').all()
        q = (request.query_params.get('q') or '').strip()
        ntype = (request.query_params.get('type') or '').strip()
        role = (request.query_params.get('role') or '').strip().lower()
        is_read = request.query_params.get('is_read')

        if ntype:
            qs = qs.filter(type=ntype)
        if role in ('driver', 'police', 'admin'):
            qs = qs.filter(user__role=role)
        if is_read is not None and str(is_read).strip() != '':
            qs = qs.filter(is_read=str(is_read).lower() in ('1', 'true', 'yes'))
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(message__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__full_name__icontains=q)
            )

        limit = min(int(request.query_params.get('page_size') or 100), 500)
        rows = qs.order_by('-created_at')[:limit]
        data = []
        for n in rows:
            item = NotificationSerializer(n).data
            item['user_email'] = getattr(n.user, 'email', '') or ''
            item['user_name'] = getattr(n.user, 'full_name', '') or ''
            item['user_role'] = getattr(n.user, 'role', '') or ''
            data.append(item)
        return success_response(data)


class AdminNotificationDetailView(APIView):
    """GET/DELETE /api/notifications/admin/<uuid>/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        n = Notification.objects.select_related('user').filter(pk=pk).first()
        if not n:
            return error_response('Notification not found', status_code=404)
        item = NotificationSerializer(n).data
        item['user_email'] = getattr(n.user, 'email', '') or ''
        item['user_name'] = getattr(n.user, 'full_name', '') or ''
        item['user_role'] = getattr(n.user, 'role', '') or ''
        return success_response(item)

    def delete(self, request, pk):
        deleted, _ = Notification.objects.filter(pk=pk).delete()
        if not deleted:
            return error_response('Notification not found', status_code=404)
        return success_response({'deleted': deleted}, message='Deleted')
