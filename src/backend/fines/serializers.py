from rest_framework import serializers

from core.media_urls import api_media_url

from .models import Fine


class FineSerializer(serializers.ModelSerializer):
    violation_id = serializers.UUIDField(source='violation.id', read_only=True, allow_null=True)
    driver_id = serializers.UUIDField(source='driver.id', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    driver_license = serializers.CharField(source='driver.license_no', read_only=True)
    police_id = serializers.UUIDField(source='police.id', read_only=True, allow_null=True)
    police_name = serializers.CharField(source='police.full_name', read_only=True, allow_null=True)
    evidence_image = serializers.SerializerMethodField()
    payment_screenshot = serializers.SerializerMethodField()

    class Meta:
        model = Fine
        fields = (
            'id', 'driver_id', 'driver_name', 'driver_license', 'police_id', 'police_name',
            'amount', 'reason', 'status', 'evidence_image', 'location', 'vehicle_plate',
            'violation_id', 'due_date', 'payment_method', 'payment_reference', 'payment_screenshot',
            'created_at', 'paid_at',
        )
        read_only_fields = ('id', 'created_at', 'police_id', 'police_name')

    def _image_url(self, image_field):
        if not image_field:
            return None
        name = getattr(image_field, 'name', '') or ''
        if not name:
            return None
        url = api_media_url(self.context.get('request'), image_field)
        return url or None

    def get_evidence_image(self, obj):
        url = self._image_url(getattr(obj, 'evidence_image', None))
        if url:
            return url
        violation = getattr(obj, 'violation', None)
        if not violation:
            return None
        for field_name in ('evidence_image', 'vehicle_evidence_image', 'plate_evidence_image'):
            url = self._image_url(getattr(violation, field_name, None))
            if url:
                return url
        log = getattr(violation, 'ai_detection_log', None)
        if log:
            for field_name in ('uploaded_image', 'vehicle_snapshot', 'plate_snapshot'):
                url = self._image_url(getattr(log, field_name, None))
                if url:
                    return url
        return None

    def get_payment_screenshot(self, obj):
        return self._image_url(getattr(obj, 'payment_screenshot', None))


class FineCreateSerializer(serializers.ModelSerializer):
    driver_id = serializers.UUIDField(required=False)
    violation_id = serializers.UUIDField(required=False, allow_null=True)
    vehicle_plate = serializers.CharField(required=False, allow_blank=True, max_length=64)

    class Meta:
        model = Fine
        fields = (
            'driver_id', 'violation_id', 'amount', 'reason', 'location',
            'vehicle_plate', 'evidence_image',
        )

    def validate_vehicle_plate(self, value):
        return str(value or '').strip()[:20]

    def validate(self, attrs):
        if not attrs.get('driver_id') and not attrs.get('violation_id'):
            raise serializers.ValidationError('driver_id or violation_id is required')
        if not attrs.get('violation_id'):
            if attrs.get('amount') is None:
                raise serializers.ValidationError({'amount': 'This field is required.'})
            if not str(attrs.get('reason') or '').strip():
                raise serializers.ValidationError({'reason': 'This field is required.'})
            if not str(attrs.get('location') or '').strip():
                raise serializers.ValidationError({'location': 'This field is required.'})
        return attrs


class FinePaymentSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=['aba', 'wing', 'acleda', 'bank_transfer', 'cash', 'stripe', 'khqr'],
    )
    payment_reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    payment_screenshot = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        method = attrs.get('payment_method')
        ref = str(attrs.get('payment_reference') or '').strip()
        if method == 'cash':
            attrs['payment_reference'] = ref or 'CASH-IN-PERSON'
            return attrs
        if not ref:
            raise serializers.ValidationError({'payment_reference': 'Payment reference is required.'})
        attrs['payment_reference'] = ref
        return attrs

