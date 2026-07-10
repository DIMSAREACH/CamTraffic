from rest_framework import serializers

from apps.violations.models import Violation

from .models import Appeal


class DriverAppealableViolationSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)
    fine_reference_number = serializers.SerializerMethodField()
    fine_amount = serializers.SerializerMethodField()
    fine_currency = serializers.SerializerMethodField()

    class Meta:
        model = Violation
        fields = (
            'id',
            'detected_at',
            'vehicle_plate',
            'traffic_sign_code',
            'traffic_sign_name',
            'fine_reference_number',
            'fine_amount',
            'fine_currency',
        )
        read_only_fields = fields

    def get_fine_reference_number(self, violation: Violation) -> str | None:
        fine = getattr(violation, 'fine', None)
        return fine.reference_number if fine is not None else None

    def get_fine_amount(self, violation: Violation) -> int | None:
        fine = getattr(violation, 'fine', None)
        return int(fine.amount) if fine is not None else None

    def get_fine_currency(self, violation: Violation) -> str | None:
        fine = getattr(violation, 'fine', None)
        return fine.currency if fine is not None else None


class DriverAppealListSerializer(serializers.ModelSerializer):
    violation_id = serializers.IntegerField(source='violation.id', read_only=True)
    vehicle_plate = serializers.CharField(source='violation.vehicle.plate_number', read_only=True)
    traffic_sign_code = serializers.CharField(source='violation.traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='violation.traffic_sign.name_en', read_only=True)

    class Meta:
        model = Appeal
        fields = (
            'id',
            'status',
            'reason',
            'violation_id',
            'vehicle_plate',
            'traffic_sign_code',
            'traffic_sign_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class DriverAppealDetailSerializer(DriverAppealListSerializer):
    evidence_url = serializers.SerializerMethodField()
    response = serializers.CharField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    detected_at = serializers.DateTimeField(source='violation.detected_at', read_only=True)
    violation_status = serializers.CharField(source='violation.status', read_only=True)
    camera_name = serializers.CharField(source='violation.camera.name', read_only=True)
    camera_code = serializers.CharField(source='violation.camera.code', read_only=True)
    station_name = serializers.CharField(
        source='violation.camera.station.name',
        read_only=True,
        allow_null=True,
    )

    class Meta(DriverAppealListSerializer.Meta):
        fields = DriverAppealListSerializer.Meta.fields + (
            'evidence_url',
            'response',
            'reviewed_at',
            'detected_at',
            'violation_status',
            'camera_name',
            'camera_code',
            'station_name',
        )

    def get_evidence_url(self, appeal: Appeal) -> str | None:
        if not appeal.evidence:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(appeal.evidence.url)
        return appeal.evidence.url


class DriverAppealCreateSerializer(serializers.Serializer):
    violation_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(min_length=10, max_length=5000)
    evidence = serializers.FileField(required=False, allow_null=True)

    def validate_reason(self, value: str) -> str:
        reason = value.strip()
        if len(reason) < 10:
            raise serializers.ValidationError('Appeal reason must be at least 10 characters.')
        return reason


class OfficerAppealListSerializer(serializers.ModelSerializer):
    driver_email = serializers.EmailField(source='driver.email', read_only=True)
    driver_name = serializers.SerializerMethodField()
    violation_id = serializers.IntegerField(source='violation.id', read_only=True)
    vehicle_plate = serializers.CharField(source='violation.vehicle.plate_number', read_only=True)
    traffic_sign_code = serializers.CharField(source='violation.traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='violation.traffic_sign.name_en', read_only=True)

    class Meta:
        model = Appeal
        fields = (
            'id',
            'status',
            'reason',
            'driver_email',
            'driver_name',
            'violation_id',
            'vehicle_plate',
            'traffic_sign_code',
            'traffic_sign_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_driver_name(self, appeal: Appeal) -> str:
        return appeal.driver.get_full_name() or appeal.driver.email


class OfficerAppealDetailSerializer(OfficerAppealListSerializer):
    evidence_url = serializers.SerializerMethodField()
    response = serializers.CharField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True, allow_null=True)
    detected_at = serializers.DateTimeField(source='violation.detected_at', read_only=True)
    violation_status = serializers.CharField(source='violation.status', read_only=True)
    camera_name = serializers.CharField(source='violation.camera.name', read_only=True)
    station_name = serializers.CharField(source='violation.camera.station.name', read_only=True, allow_null=True)

    class Meta(OfficerAppealListSerializer.Meta):
        fields = OfficerAppealListSerializer.Meta.fields + (
            'evidence_url',
            'response',
            'reviewed_at',
            'reviewed_by_email',
            'detected_at',
            'violation_status',
            'camera_name',
            'station_name',
        )

    def get_evidence_url(self, appeal: Appeal) -> str | None:
        if not appeal.evidence:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(appeal.evidence.url)
        return appeal.evidence.url


class OfficerAppealDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['approved', 'rejected'])
    response = serializers.CharField(min_length=5, max_length=5000)

    def validate_response(self, value: str) -> str:
        response = value.strip()
        if len(response) < 5:
            raise serializers.ValidationError('Response must be at least 5 characters.')
        return response
