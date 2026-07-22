from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True, allow_null=True)
    user_role = serializers.CharField(source='user.role', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = (
            'id', 'user_id', 'user_name', 'user_role', 'action', 'resource',
            'resource_id', 'ip_address', 'timestamp', 'old_value', 'new_value', 'extra_data',
        )
