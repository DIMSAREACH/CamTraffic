from rest_framework import serializers

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

    def _absolute_media(self, obj, field_name):
        file_field = getattr(obj, field_name, None)
        if not file_field:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_evidence_image(self, obj):
        return self._absolute_media(obj, 'evidence_image')

    def get_payment_screenshot(self, obj):
        return self._absolute_media(obj, 'payment_screenshot')


class FineCreateSerializer(serializers.ModelSerializer):
    driver_id = serializers.UUIDField(required=False)
    violation_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Fine
        fields = (
            'driver_id', 'violation_id', 'amount', 'reason', 'location',
            'vehicle_plate', 'evidence_image',
        )

    def validate(self, attrs):
        if not attrs.get('driver_id') and not attrs.get('violation_id'):
            raise serializers.ValidationError('driver_id or violation_id is required')
        if not attrs.get('violation_id'):
            if attrs.get('amount') is None:
                raise serializers.ValidationError({'amount': 'This field is required.'})
            if not str(attrs.get('reason') or '').strip():
                raise serializers.ValidationError({'reason': 'This field is required.'})
        return attrs


class FinePaymentSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=['aba', 'wing', 'acleda', 'bank_transfer', 'cash', 'stripe', 'khqr'],
    )
    payment_reference = serializers.CharField(max_length=200)
    payment_screenshot = serializers.ImageField(required=False, allow_null=True)

    def validate_payment_reference(self, value):
        if not str(value or '').strip():
            raise serializers.ValidationError('Payment reference is required.')
        return value.strip()

