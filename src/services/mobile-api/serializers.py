"""Compact serializers for mobile bandwidth."""

from rest_framework import serializers

from appeals.models import ViolationAppeal
from fines.models import Fine
from notifications.models import Notification
from vehicles.models import Vehicle
from violations.models import TrafficViolation


class MobileVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = (
            'id',
            'plate_number',
            'vehicle_type',
            'make',
            'model',
            'color',
            'year',
            'status',
            'created_at',
        )


class MobileViolationSerializer(serializers.ModelSerializer):
    plate_number = serializers.CharField(source='plate_detected', read_only=True)
    confidence = serializers.DecimalField(
        source='ai_confidence_score',
        max_digits=5,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    occurred_at = serializers.DateTimeField(source='violation_date', read_only=True)

    class Meta:
        model = TrafficViolation
        fields = (
            'id',
            'violation_type',
            'status',
            'location',
            'plate_number',
            'confidence',
            'occurred_at',
            'created_at',
            'evidence_image',
            'description',
        )


class MobileFineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fine
        fields = (
            'id',
            'amount',
            'reason',
            'status',
            'location',
            'vehicle_plate',
            'due_date',
            'paid_at',
            'created_at',
            'violation_id',
        )


class MobileAppealSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViolationAppeal
        fields = (
            'id',
            'violation',
            'reason',
            'status',
            'submitted_at',
            'updated_at',
            'officer_comments',
        )
        read_only_fields = ('status', 'submitted_at', 'updated_at', 'officer_comments')


class MobileNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(source='type', read_only=True)

    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'is_read', 'created_at')


class MobileAppealCreateSerializer(serializers.Serializer):
    violation_id = serializers.UUIDField()
    reason = serializers.CharField(min_length=10, max_length=2000)


class MobileDeviceTokenSerializer(serializers.Serializer):
    device_token = serializers.CharField(max_length=512)
    platform = serializers.ChoiceField(choices=('ios', 'android', 'web'), default='android')


class MobileApproveSerializer(serializers.Serializer):
    officer_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class MobileRejectSerializer(serializers.Serializer):
    dismissal_reason = serializers.CharField(min_length=3, max_length=200)
