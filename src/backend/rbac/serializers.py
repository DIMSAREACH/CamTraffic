from rest_framework import serializers

from .models import Permission, Role, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ('id', 'perm_name', 'action_type', 'resource', 'description', 'created_at')


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = (
            'id',
            'role_name',
            'description',
            'status',
            'assigned_date',
            'created_at',
            'permissions',
        )

    def get_permissions(self, obj):
        permission_ids = RolePermission.objects.filter(role=obj).values_list('permission_id', flat=True)
        queryset = Permission.objects.filter(id__in=permission_ids).order_by('resource', 'action_type')
        return PermissionSerializer(queryset, many=True).data


class RoleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('role_name', 'description', 'status')


class RolePermissionAssignSerializer(serializers.Serializer):
    permission_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
    )
