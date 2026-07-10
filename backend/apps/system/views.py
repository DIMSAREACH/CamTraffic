from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole
from apps.traffic_signs.models import SignCategory

from .backup_services import create_backup_record, delete_backup_file, restore_backup_record
from .locales import DEFAULT_LOCALE, SUPPORTED_LOCALES
from .models import BackupRecord, SystemSetting
from .serializers import (
    BackupCreateSerializer,
    BackupRecordSerializer,
    BackupRestoreResultSerializer,
    SystemSettingCreateSerializer,
    SystemSettingManageSerializer,
    SystemSettingUpdateSerializer,
)


@api_view(['GET'])
def locales(request):
    """List supported API locales (English and Khmer)."""
    return Response(
        {
            'default': DEFAULT_LOCALE,
            'locales': SUPPORTED_LOCALES,
        },
        status=status.HTTP_200_OK,
    )


class SystemSettingListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = SystemSetting.objects.order_by('key')

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(key__icontains=search) | Q(description__icontains=search) | Q(value__icontains=search),
            )

        value_type = request.query_params.get('value_type', '').strip()
        if value_type:
            queryset = queryset.filter(value_type=value_type)

        is_public = request.query_params.get('is_public', '').strip().lower()
        if is_public in ('true', 'false'):
            queryset = queryset.filter(is_public=is_public == 'true')

        return success_response(SystemSettingManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SystemSettingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        setting = serializer.save()
        return success_response(
            SystemSettingManageSerializer(setting).data,
            message='System setting created successfully.',
            status=status.HTTP_201_CREATED,
        )


class SystemSettingDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_setting(setting_id: int) -> SystemSetting:
        return get_object_or_404(SystemSetting, id=setting_id)

    def patch(self, request, setting_id: int):
        setting = self._get_setting(setting_id)
        serializer = SystemSettingUpdateSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        setting = serializer.save()
        return success_response(
            SystemSettingManageSerializer(setting).data,
            message='System setting updated successfully.',
        )

    def delete(self, request, setting_id: int):
        setting = self._get_setting(setting_id)
        setting.delete()
        return success_response(None, message='System setting deleted successfully.')


class BackupListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = BackupRecord.objects.order_by('-created_at')
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50
        records = queryset[:limit]
        serializer = BackupRecordSerializer(records, many=True, context={'request': request})
        return success_response(serializer.data)

    def post(self, request):
        serializer = BackupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = create_backup_record(serializer.validated_data.get('notes', ''))
        return success_response(
            BackupRecordSerializer(record, context={'request': request}).data,
            message='Backup created successfully.' if record.status == BackupRecord.Status.COMPLETED else 'Backup failed.',
            status=status.HTTP_201_CREATED,
        )


class BackupDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_backup(backup_id: int) -> BackupRecord:
        return get_object_or_404(BackupRecord, id=backup_id)

    def get(self, request, backup_id: int):
        record = self._get_backup(backup_id)
        return success_response(BackupRecordSerializer(record, context={'request': request}).data)

    def delete(self, request, backup_id: int):
        record = self._get_backup(backup_id)
        delete_backup_file(record)
        record.delete()
        return success_response(None, message='Backup deleted successfully.')


class BackupRestoreView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def post(self, request, backup_id: int):
        record = get_object_or_404(BackupRecord, id=backup_id)
        try:
            counts = restore_backup_record(record)
        except (ValueError, FileNotFoundError, KeyError) as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)
        except SignCategory.DoesNotExist:
            return error_response(
                'Backup references a missing sign category. Restore sign categories first.',
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = BackupRestoreResultSerializer(counts).data
        return success_response(result, message='Backup restored successfully.')
