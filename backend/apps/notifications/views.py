from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole

from .models import Notification, NotificationTemplate
from .serializers import (
    DriverNotificationSerializer,
    DriverNotificationSummarySerializer,
    DriverNotificationUpdateSerializer,
    NotificationTemplateCreateSerializer,
    NotificationTemplateManageSerializer,
    NotificationTemplateUpdateSerializer,
    OfficerNotificationSerializer,
    OfficerNotificationSummarySerializer,
    OfficerNotificationUpdateSerializer,
)


class NotificationTemplateListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = NotificationTemplate.objects.annotate(
            notification_count=Count('notifications'),
        ).order_by('code')

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(subject_en__icontains=search)
                | Q(subject_km__icontains=search),
            )

        channel = request.query_params.get('channel', '').strip()
        if channel:
            queryset = queryset.filter(channel=channel)

        is_active = request.query_params.get('is_active', '').strip().lower()
        if is_active in ('true', 'false'):
            queryset = queryset.filter(is_active=is_active == 'true')

        return success_response(NotificationTemplateManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = NotificationTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        template = NotificationTemplate.objects.annotate(
            notification_count=Count('notifications'),
        ).get(pk=template.pk)
        return success_response(
            NotificationTemplateManageSerializer(template).data,
            message='Notification template created successfully.',
            status=status.HTTP_201_CREATED,
        )


class NotificationTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_template(template_id: int) -> NotificationTemplate:
        return get_object_or_404(
            NotificationTemplate.objects.annotate(notification_count=Count('notifications')),
            id=template_id,
        )

    def get(self, request, template_id: int):
        template = self._get_template(template_id)
        return success_response(NotificationTemplateManageSerializer(template).data)

    def patch(self, request, template_id: int):
        template = self._get_template(template_id)
        serializer = NotificationTemplateUpdateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        template = NotificationTemplate.objects.annotate(
            notification_count=Count('notifications'),
        ).get(pk=template.pk)
        return success_response(
            NotificationTemplateManageSerializer(template).data,
            message='Notification template updated successfully.',
        )

    def delete(self, request, template_id: int):
        template = self._get_template(template_id)
        if template.notifications.exists():
            return error_response(
                'Cannot delete a template with sent notifications. Deactivate it instead.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        template.delete()
        return success_response(None, message='Notification template deleted successfully.')


def officer_notification_queryset(user):
    return Notification.objects.filter(user=user).select_related('template').order_by('-created_at')


def filter_officer_notification_queryset(queryset, request):
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(Q(title__icontains=search) | Q(body__icontains=search))

    is_read = request.query_params.get('is_read', '').strip().lower()
    if is_read in ('true', 'false'):
        queryset = queryset.filter(is_read=(is_read == 'true'))

    return queryset


class OfficerNotificationSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        queryset = officer_notification_queryset(request.user)
        payload = {
            'total': queryset.count(),
            'unread': queryset.filter(is_read=False).count(),
        }
        serializer = OfficerNotificationSummarySerializer(payload)
        return success_response(serializer.data)


class OfficerNotificationListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        queryset = filter_officer_notification_queryset(officer_notification_queryset(request.user), request)
        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50
        queryset = queryset[:limit]
        serializer = OfficerNotificationSerializer(queryset, many=True)
        return success_response(serializer.data)


class OfficerNotificationDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def _get_notification(self, request, notification_id: int) -> Notification:
        return get_object_or_404(officer_notification_queryset(request.user), id=notification_id)

    def get(self, request, notification_id: int):
        notification = self._get_notification(request, notification_id)
        serializer = OfficerNotificationSerializer(notification)
        return success_response(serializer.data)

    def patch(self, request, notification_id: int):
        notification = self._get_notification(request, notification_id)
        serializer = OfficerNotificationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'is_read' in serializer.validated_data:
            is_read = serializer.validated_data['is_read']
            notification.is_read = is_read
            notification.read_at = timezone.now() if is_read else None
            notification.save(update_fields=['is_read', 'read_at', 'updated_at'])

        notification = self._get_notification(request, notification_id)
        return success_response(
            OfficerNotificationSerializer(notification).data,
            message='Notification updated successfully.',
        )


class OfficerNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def post(self, request):
        now = timezone.now()
        updated = (
            officer_notification_queryset(request.user)
            .filter(is_read=False)
            .update(is_read=True, read_at=now, updated_at=now)
        )
        return success_response({'updated': updated}, message='All notifications marked as read.')


driver_notification_queryset = officer_notification_queryset
filter_driver_notification_queryset = filter_officer_notification_queryset


class DriverNotificationSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = driver_notification_queryset(request.user)
        payload = {
            'total': queryset.count(),
            'unread': queryset.filter(is_read=False).count(),
        }
        serializer = DriverNotificationSummarySerializer(payload)
        return success_response(serializer.data)


class DriverNotificationListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = filter_driver_notification_queryset(driver_notification_queryset(request.user), request)
        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50
        queryset = queryset[:limit]
        serializer = DriverNotificationSerializer(queryset, many=True)
        return success_response(serializer.data)


class DriverNotificationDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def _get_notification(self, request, notification_id: int) -> Notification:
        return get_object_or_404(driver_notification_queryset(request.user), id=notification_id)

    def get(self, request, notification_id: int):
        notification = self._get_notification(request, notification_id)
        serializer = DriverNotificationSerializer(notification)
        return success_response(serializer.data)

    def patch(self, request, notification_id: int):
        notification = self._get_notification(request, notification_id)
        serializer = DriverNotificationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'is_read' in serializer.validated_data:
            is_read = serializer.validated_data['is_read']
            notification.is_read = is_read
            notification.read_at = timezone.now() if is_read else None
            notification.save(update_fields=['is_read', 'read_at', 'updated_at'])

        notification = self._get_notification(request, notification_id)
        return success_response(
            DriverNotificationSerializer(notification).data,
            message='Notification updated successfully.',
        )


class DriverNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def post(self, request):
        now = timezone.now()
        updated = (
            driver_notification_queryset(request.user)
            .filter(is_read=False)
            .update(is_read=True, read_at=now, updated_at=now)
        )
        return success_response({'updated': updated}, message='All notifications marked as read.')
