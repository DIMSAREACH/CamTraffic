from rest_framework import serializers

from users.models import Driver

from .models import TrafficViolation, ViolationRule


class ViolationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViolationRule
        fields = (
            'id', 'rule_code', 'category', 'detection_type', 'priority',
            'sign_class_key', 'prohibited_action', 'violation_type',
            'title', 'description', 'default_fine_amount', 'demerit_points',
            'legal_reference', 'warning_only', 'auto_generate_fine', 'config',
            'is_active', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def validate_rule_code(self, value):
        code = (value or '').strip().upper()
        if not code:
            return code
        qs = ViolationRule.objects.filter(rule_code__iexact=code)
        if self.instance and self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Rule code already exists.')
        return code

    def validate(self, attrs):
        sign = attrs.get('sign_class_key', getattr(self.instance, 'sign_class_key', None))
        action = attrs.get('prohibited_action', getattr(self.instance, 'prohibited_action', None))
        if sign and action:
            qs = ViolationRule.objects.filter(
                sign_class_key__iexact=str(sign).strip(),
                prohibited_action__iexact=str(action).strip(),
            )
            if self.instance and self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    'A rule with this sign class and prohibited action already exists.',
                )
        return attrs


class ViolationEvaluateSerializer(serializers.Serializer):
    class_key = serializers.CharField(max_length=80)
    observed_action = serializers.CharField(max_length=50)
    sign_code = serializers.CharField(max_length=30, required=False, allow_blank=True)


class ViolationCreateSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    class_key = serializers.CharField(max_length=80)
    observed_action = serializers.CharField(max_length=50)
    sign_code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    camera_id = serializers.UUIDField(required=False, allow_null=True)
    road_id = serializers.UUIDField(required=False, allow_null=True)
    ai_detection_log_id = serializers.UUIDField(required=False, allow_null=True)
    plate_number = serializers.CharField(max_length=32, required=False, allow_blank=True)
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
    vehicle_plate = serializers.SerializerMethodField()
    evidence_image = serializers.SerializerMethodField()
    vehicle_evidence_image = serializers.SerializerMethodField()
    plate_evidence_image = serializers.SerializerMethodField()
    fine_id = serializers.UUIDField(source='fine.id', read_only=True, allow_null=True)

    class Meta:
        model = TrafficViolation
        fields = (
            'id', 'driver_id', 'driver_user_id', 'driver_name', 'driver_license',
            'officer_name', 'vehicle_plate', 'plate_detected', 'violation_type', 'observed_action',
            'detected_sign_code', 'detected_class_key', 'violation_date', 'location',
            'description', 'evidence_image', 'vehicle_evidence_image', 'plate_evidence_image',
            'status', 'ai_detection_log',
            'camera', 'road', 'fine_id', 'created_at', 'updated_at',
        )

    def get_vehicle_plate(self, obj):
        # Prefer the plate observed at detection time (OCR / unknown queue).
        detected = (getattr(obj, 'plate_detected', None) or '').strip()
        if detected and detected.upper() not in {'UNKNOWN', 'N/A', 'NONE', 'NULL', '-'}:
            return detected
        if obj.vehicle_id:
            linked = (getattr(obj.vehicle, 'plate_number', None) or '').strip()
            if linked:
                return linked
        return detected or None

    def _image_url(self, image_field):
        if not image_field:
            return None
        name = getattr(image_field, 'name', '') or ''
        if not name:
            return None
        from core.media_urls import api_media_url

        url = api_media_url(self.context.get('request'), image_field)
        return url or None

    def get_evidence_image(self, obj):
        if obj.evidence_image:
            url = self._image_url(obj.evidence_image)
            if url:
                return url
        if obj.ai_detection_log and obj.ai_detection_log.uploaded_image:
            return self._image_url(obj.ai_detection_log.uploaded_image)
        return None

    def get_vehicle_evidence_image(self, obj):
        if obj.vehicle_evidence_image:
            url = self._image_url(obj.vehicle_evidence_image)
            if url:
                return url
        if obj.ai_detection_log and obj.ai_detection_log.vehicle_snapshot:
            return self._image_url(obj.ai_detection_log.vehicle_snapshot)
        return None

    def get_plate_evidence_image(self, obj):
        if obj.plate_evidence_image:
            url = self._image_url(obj.plate_evidence_image)
            if url:
                return url
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
