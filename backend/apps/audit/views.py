from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.rbac.permissions import HasRBACRole

from .models import AuditLog, LoginHistory
from .serializers import AuditLogSerializer, AuditLogSummarySerializer, LoginHistorySerializer
from .services import get_audit_log_summary

User = get_user_model()


def _parse_limit(limit_param: str | None, default: int = 50) -> int:
    if not limit_param:
        return default
    try:
        return max(1, min(int(limit_param), 100))
    except ValueError:
        return default


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value)
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed)
    return parsed


class AuditLogSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        serializer = AuditLogSummarySerializer(get_audit_log_summary())
        return success_response(serializer.data)


class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-created_at')

        action = request.query_params.get('action', '').strip()
        if action:
            queryset = queryset.filter(action=action)

        module = request.query_params.get('module', '').strip()
        if module:
            queryset = queryset.filter(module__icontains=module)

        user_id = request.query_params.get('user_id', '').strip()
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(object_type__icontains=search)
                | Q(object_id__icontains=search)
                | Q(module__icontains=search)
            )

        date_from = _parse_datetime(request.query_params.get('date_from', '').strip())
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        date_to = _parse_datetime(request.query_params.get('date_to', '').strip())
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        limit = _parse_limit(request.query_params.get('limit'))
        records = queryset[:limit]
        return success_response(AuditLogSerializer(records, many=True).data)


class LoginHistoryListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = LoginHistory.objects.select_related('user').order_by('-created_at')

        user_id = request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        success = request.query_params.get('success')
        if success in ('true', 'false'):
            queryset = queryset.filter(success=success == 'true')

        limit = _parse_limit(request.query_params.get('limit'), default=20)
        records = queryset[:limit]
        return success_response(LoginHistorySerializer(records, many=True).data)
