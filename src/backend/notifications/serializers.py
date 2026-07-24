from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = Notification
        fields = ('id', 'user_id', 'title', 'message', 'is_read', 'type', 'created_at')
        read_only_fields = ('id', 'user_id', 'created_at')
