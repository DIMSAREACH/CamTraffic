from rest_framework import serializers

from .models import UserPreference


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = (
            'notify_fines',
            'notify_detections',
            'notify_alerts',
            'notify_system',
            'two_factor_enabled',
            'login_notifications',
            'suspicious_alerts',
            'muted_until',
        )
