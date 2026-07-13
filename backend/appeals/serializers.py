from rest_framework import serializers

from .models import ViolationAppeal


class ViolationAppealSerializer(serializers.ModelSerializer):
    violation_id = serializers.UUIDField(source='violation.id', read_only=True)
    fine_id = serializers.UUIDField(source='fine.id', read_only=True, allow_null=True)
    driver_id = serializers.UUIDField(source='driver.id', read_only=True)
    driver_name = serializers.CharField(source='driver.user.full_name', read_only=True)
    driver_license = serializers.CharField(source='driver.license_no', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)
    evidence_image = serializers.SerializerMethodField()
    violation_type = serializers.CharField(source='violation.violation_type', read_only=True)
    violation_location = serializers.CharField(source='violation.location', read_only=True)

    class Meta:
        model = ViolationAppeal
        fields = (
            'id', 'violation_id', 'fine_id', 'driver_id', 'driver_name', 'driver_license',
            'reason', 'evidence_image', 'status', 'submitted_at', 'review_date',
            'reviewed_by', 'reviewed_by_name', 'officer_comments', 'updated_at',
            'violation_type', 'violation_location',
        )
        read_only_fields = (
            'id', 'status', 'submitted_at', 'review_date', 'reviewed_by',
            'reviewed_by_name', 'officer_comments', 'updated_at',
        )

    def get_evidence_image(self, obj):
        if not obj.evidence_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.evidence_image.url)
        return obj.evidence_image.url


class ViolationAppealCreateSerializer(serializers.ModelSerializer):
    violation_id = serializers.UUIDField(write_only=True)
    fine_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = ViolationAppeal
        fields = ('violation_id', 'fine_id', 'reason', 'evidence_image')

    def validate_reason(self, value):
        if not str(value or '').strip():
            raise serializers.ValidationError('Reason is required.')
        return value.strip()
