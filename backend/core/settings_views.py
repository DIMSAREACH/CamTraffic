"""REST API for admin system settings (key/value JSON store)."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.models import SystemSetting
from core.permissions import IsAdmin
from core.responses import error_response, success_response


class SystemSettingListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        prefix = (request.query_params.get('prefix') or '').strip()
        qs = SystemSetting.objects.all().order_by('key')
        if prefix:
            qs = qs.filter(key__startswith=prefix)
        rows = [
            {
                'id': str(row.id),
                'key': row.key,
                'value': row.value,
                'description': row.description,
                'is_public': row.is_public,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in qs
        ]
        return success_response(rows)

    def post(self, request):
        key = (request.data.get('key') or '').strip()
        if not key:
            return error_response('key is required', status_code=status.HTTP_400_BAD_REQUEST)
        value = request.data.get('value', {})
        description = request.data.get('description', '')
        is_public = bool(request.data.get('is_public', False))
        row, created = SystemSetting.objects.update_or_create(
            key=key,
            defaults={
                'value': value,
                'description': description,
                'is_public': is_public,
            },
        )
        log_audit(
            user=request.user,
            action='create' if created else 'update',
            resource='system_setting',
            resource_id=row.id,
            request=request,
            new_value={'key': key},
        )
        return success_response(
            {'id': str(row.id), 'key': row.key, 'value': row.value},
            message='Setting saved',
            status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SystemSettingDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, key):
        try:
            row = SystemSetting.objects.get(key=key)
        except SystemSetting.DoesNotExist:
            return error_response('Setting not found', status_code=status.HTTP_404_NOT_FOUND)
        return success_response({
            'id': str(row.id),
            'key': row.key,
            'value': row.value,
            'description': row.description,
            'is_public': row.is_public,
        })

    def patch(self, request, key):
        try:
            row = SystemSetting.objects.get(key=key)
        except SystemSetting.DoesNotExist:
            return error_response('Setting not found', status_code=status.HTTP_404_NOT_FOUND)
        if 'value' in request.data:
            row.value = request.data['value']
        if 'description' in request.data:
            row.description = request.data['description']
        if 'is_public' in request.data:
            row.is_public = bool(request.data['is_public'])
        row.save()
        log_audit(
            user=request.user,
            action='update',
            resource='system_setting',
            resource_id=row.id,
            request=request,
            new_value={'key': key},
        )
        return success_response({'key': row.key, 'value': row.value}, message='Setting updated')

    def delete(self, request, key):
        try:
            row = SystemSetting.objects.get(key=key)
        except SystemSetting.DoesNotExist:
            return error_response('Setting not found', status_code=status.HTTP_404_NOT_FOUND)
        row.delete()
        return success_response(message='Setting deleted')
