from rest_framework import serializers

from .models import Notification, NotificationTemplate


class NotificationTemplateManageSerializer(serializers.ModelSerializer):
    notification_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = (
            'id',
            'code',
            'name',
            'channel',
            'subject_en',
            'subject_km',
            'body_en',
            'body_km',
            'is_active',
            'notification_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'notification_count', 'created_at', 'updated_at')

    def validate_code(self, value: str) -> str:
        code = value.strip().lower()
        queryset = NotificationTemplate.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A notification template with this code already exists.')
        return code


class NotificationTemplateCreateSerializer(NotificationTemplateManageSerializer):
    class Meta(NotificationTemplateManageSerializer.Meta):
        read_only_fields = ('id', 'notification_count', 'created_at', 'updated_at')


class NotificationTemplateUpdateSerializer(NotificationTemplateManageSerializer):
    class Meta(NotificationTemplateManageSerializer.Meta):
        read_only_fields = ('id', 'notification_count', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('code', 'name', 'channel', 'subject_en', 'body_en'):
            self.fields[field_name].required = False


class OfficerNotificationSerializer(serializers.ModelSerializer):
    template_code = serializers.CharField(source='template.code', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = (
            'id',
            'title',
            'body',
            'is_read',
            'read_at',
            'template_code',
            'data',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class OfficerNotificationSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()


class OfficerNotificationUpdateSerializer(serializers.Serializer):
    is_read = serializers.BooleanField()


DriverNotificationSerializer = OfficerNotificationSerializer
DriverNotificationSummarySerializer = OfficerNotificationSummarySerializer
DriverNotificationUpdateSerializer = OfficerNotificationUpdateSerializer
