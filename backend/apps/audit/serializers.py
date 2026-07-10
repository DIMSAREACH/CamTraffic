from rest_framework import serializers

from .models import AuditLog, LoginHistory


class LoginHistorySerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source='user_id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = LoginHistory
        fields = (
            'id',
            'user_id',
            'user_email',
            'user_full_name',
            'ip_address',
            'user_agent',
            'success',
            'failure_reason',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_user_full_name(self, instance: LoginHistory) -> str:
        first_name = (instance.user.first_name or '').strip()
        last_name = (instance.user.last_name or '').strip()
        full_name = f'{first_name} {last_name}'.strip()
        return full_name or instance.user.email


class AuditLogActionCountSerializer(serializers.Serializer):
    action = serializers.CharField()
    count = serializers.IntegerField()


class AuditLogModuleCountSerializer(serializers.Serializer):
    module = serializers.CharField()
    count = serializers.IntegerField()


class AuditLogSummarySerializer(serializers.Serializer):
    total_logs = serializers.IntegerField()
    logs_today = serializers.IntegerField()
    by_action = AuditLogActionCountSerializer(many=True)
    by_module = AuditLogModuleCountSerializer(many=True)


class AuditLogSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'user_id',
            'user_email',
            'user_full_name',
            'action',
            'module',
            'object_type',
            'object_id',
            'description',
            'ip_address',
            'user_agent',
            'metadata',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_user_full_name(self, instance: AuditLog) -> str:
        if instance.user is None:
            return 'System'
        first_name = (instance.user.first_name or '').strip()
        last_name = (instance.user.last_name or '').strip()
        full_name = f'{first_name} {last_name}'.strip()
        return full_name or instance.user.email
