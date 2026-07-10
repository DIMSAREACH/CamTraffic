from __future__ import annotations

import json

from rest_framework import serializers

from .models import BackupRecord, SystemSetting


def validate_setting_value(value: str, value_type: str) -> str:
    if value_type == SystemSetting.ValueType.INTEGER:
        try:
            int(value)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError('Value must be a valid integer.') from exc
        return str(int(value))
    if value_type == SystemSetting.ValueType.BOOLEAN:
        normalized = str(value).strip().lower()
        if normalized not in ('true', 'false'):
            raise serializers.ValidationError('Value must be true or false.')
        return normalized
    if value_type == SystemSetting.ValueType.JSON:
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError('Value must be valid JSON.') from exc
        return json.dumps(parsed)
    return str(value)


class SystemSettingManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = (
            'id',
            'key',
            'value',
            'value_type',
            'description',
            'is_public',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_key(self, value: str) -> str:
        key = value.strip().lower()
        queryset = SystemSetting.objects.filter(key__iexact=key)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A setting with this key already exists.')
        return key

    def validate(self, attrs):
        value_type = attrs.get('value_type', getattr(self.instance, 'value_type', SystemSetting.ValueType.STRING))
        value = attrs.get('value', getattr(self.instance, 'value', ''))
        if 'value' in attrs or 'value_type' in attrs:
            attrs['value'] = validate_setting_value(value, value_type)
        return attrs


class SystemSettingCreateSerializer(SystemSettingManageSerializer):
    class Meta(SystemSettingManageSerializer.Meta):
        read_only_fields = ('id', 'created_at', 'updated_at')


class SystemSettingUpdateSerializer(SystemSettingManageSerializer):
    class Meta(SystemSettingManageSerializer.Meta):
        read_only_fields = ('id', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('key', 'value', 'value_type', 'description', 'is_public'):
            self.fields[field_name].required = False


class BackupRecordSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = BackupRecord
        fields = (
            'id',
            'filename',
            'file_path',
            'file_url',
            'file_size',
            'status',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_file_url(self, obj: BackupRecord) -> str | None:
        if not obj.file_path or obj.status != BackupRecord.Status.COMPLETED:
            return None
        request = self.context.get('request')
        media_url = f'/media/{obj.file_path.lstrip("/")}'
        if request is not None:
            return request.build_absolute_uri(media_url)
        return media_url


class BackupCreateSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class BackupRestoreResultSerializer(serializers.Serializer):
    system_settings = serializers.IntegerField()
    notification_templates = serializers.IntegerField()
    sign_categories = serializers.IntegerField()
    traffic_signs = serializers.IntegerField()
