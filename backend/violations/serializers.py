from rest_framework import serializers

from users.models import Driver

from .models import TrafficViolation, ViolationRule


class ViolationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViolationRule
        fields = (
            'id', 'sign_class_key', 'prohibited_action', 'violation_type',
            'title', 'description', 'default_fine_amount', 'is_active', 'created_at',
        )


class ViolationEvaluateSerializer(serializers.Serializer):
    class_key = serializers.CharField(max_length=80)
    observed_action = serializers.CharField(max_length=50)
    sign_code = serializers.CharField(max_length=30, required=False, allow_blank=True)


class ViolationCreateSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    class_key = serializers.CharField(max_length=80)
    observed_action = serializers.CharField(max_length=50)
    sign_code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    camera_id = serializers.UUIDField(required=False, allow_null=True)
    road_id = serializers.UUIDField(required=False, allow_null=True)
    ai_detection_log_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=['draft', 'pending_review', 'confirmed', 'rejected'],
        required=False,
        default='pending_review',
    )


class TrafficViolationSerializer(serializers.ModelSerializer):
    driver_id = serializers.UUIDField(source='driver.id', read_only=True)
    driver_name = serializers.CharField(source='driver.user.full_name', read_only=True)
    driver_license = serializers.CharField(source='driver.license_no', read_only=True)
    driver_user_id = serializers.UUIDField(source='driver.user.id', read_only=True)
    officer_name = serializers.CharField(source='officer.user.full_name', read_only=True, allow_null=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True, allow_null=True)
    evidence_image = serializers.SerializerMethodField()
    vehicle_evidence_image = serializers.SerializerMethodField()
    plate_evidence_image = serializers.SerializerMethodField()
    fine_id = serializers.UUIDField(source='fine.id', read_only=True, allow_null=True)

    class Meta:
        model = TrafficViolation
        fields = (
            'id', 'driver_id', 'driver_user_id', 'driver_name', 'driver_license',
            'officer_name', 'vehicle_plate', 'violation_type', 'observed_action',
            'detected_sign_code', 'detected_class_key', 'violation_date', 'location',
            'description', 'evidence_image', 'vehicle_evidence_image', 'plate_evidence_image',
            'status', 'ai_detection_log',
            'camera', 'road', 'fine_id', 'created_at', 'updated_at',
        )

    def _image_url(self, image_field):
        if not image_field:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url

    def get_evidence_image(self, obj):
        if obj.evidence_image:
            return self._image_url(obj.evidence_image)
        if obj.ai_detection_log and obj.ai_detection_log.uploaded_image:
            return self._image_url(obj.ai_detection_log.uploaded_image)
        return None

    def get_vehicle_evidence_image(self, obj):
        if obj.vehicle_evidence_image:
            return self._image_url(obj.vehicle_evidence_image)
        if obj.ai_detection_log and obj.ai_detection_log.vehicle_snapshot:
            return self._image_url(obj.ai_detection_log.vehicle_snapshot)
        return None

    def get_plate_evidence_image(self, obj):
        if obj.plate_evidence_image:
            return self._image_url(obj.plate_evidence_image)
        if obj.ai_detection_log and obj.ai_detection_log.plate_snapshot:
            return self._image_url(obj.ai_detection_log.plate_snapshot)
        return None


class TrafficViolationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficViolation
        fields = ('status', 'location', 'description')


class DriverFieldSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()

    def validate_driver_id(self, value):
        if not Driver.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Driver not found')
        return value
