from rest_framework import serializers

from .models import Fine


class FineSerializer(serializers.ModelSerializer):
    violation_id = serializers.IntegerField(source='violation.id', read_only=True, allow_null=True)
    driver_id = serializers.IntegerField(source='driver.id', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    driver_license = serializers.CharField(source='driver.license_no', read_only=True)
    police_id = serializers.IntegerField(source='police.id', read_only=True)
    police_name = serializers.CharField(source='police.full_name', read_only=True)
    evidence_image = serializers.SerializerMethodField()

    class Meta:
        model = Fine
        fields = (
            'id', 'driver_id', 'driver_name', 'driver_license', 'police_id', 'police_name',
            'amount', 'reason', 'status', 'evidence_image', 'location', 'vehicle_plate',
            'violation_id', 'due_date', 'payment_method',
            'created_at', 'paid_at',
        )
        read_only_fields = ('id', 'created_at', 'police_id', 'police_name')

    def get_evidence_image(self, obj):
        if obj.evidence_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.evidence_image.url)
            return obj.evidence_image.url
        return None


class FineCreateSerializer(serializers.ModelSerializer):
    driver_id = serializers.IntegerField(required=False)
    violation_id = serializers.IntegerField(required=False, allow_null=True)

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
