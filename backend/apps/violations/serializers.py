from rest_framework import serializers

from .models import Violation


class OfficerViolationReviewListSerializer(serializers.ModelSerializer):
    driver_email = serializers.EmailField(source='driver.email', read_only=True)
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_code = serializers.CharField(source='camera.code', read_only=True)
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)
    fine_amount = serializers.DecimalField(
        source='traffic_sign.fine_amount',
        max_digits=12,
        decimal_places=0,
        read_only=True,
    )
    evidence_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Violation
        fields = (
            'id',
            'status',
            'detected_at',
            'driver_email',
            'driver_name',
            'vehicle_plate',
            'camera_name',
            'camera_code',
            'traffic_sign_code',
            'traffic_sign_name',
            'fine_amount',
            'evidence_image_url',
        )
        read_only_fields = fields

    def get_driver_name(self, obj: Violation) -> str:
        return obj.driver.get_full_name() or obj.driver.email

    def get_evidence_image_url(self, obj: Violation) -> str | None:
        if not obj.evidence_image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.evidence_image.url)
        return obj.evidence_image.url


class OfficerViolationReviewDetailSerializer(OfficerViolationReviewListSerializer):
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True, allow_null=True)
    detection_id = serializers.IntegerField(source='detection.id', read_only=True)
    detection_confidence = serializers.FloatField(source='detection.confidence', read_only=True)
    detection_image_url = serializers.SerializerMethodField()
    vehicle_make = serializers.CharField(source='vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    vehicle_year = serializers.IntegerField(source='vehicle.year', read_only=True)
    vehicle_color = serializers.CharField(source='vehicle.color', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    station_name = serializers.CharField(source='camera.station.name', read_only=True, allow_null=True)
    traffic_sign_name_km = serializers.CharField(source='traffic_sign.name_km', read_only=True)
    officer_notes = serializers.CharField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta(OfficerViolationReviewListSerializer.Meta):
        fields = OfficerViolationReviewListSerializer.Meta.fields + (
            'detection_id',
            'detection_confidence',
            'detection_image_url',
            'vehicle_make',
            'vehicle_model',
            'vehicle_year',
            'vehicle_color',
            'camera_location',
            'station_name',
            'traffic_sign_name_km',
            'officer_notes',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        )

    def get_detection_image_url(self, obj: Violation) -> str | None:
        image = obj.detection.image
        if not image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(image.url)
        return image.url


class OfficerViolationDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['approve', 'reject'])
    officer_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class OfficerViolationDecisionResultSerializer(serializers.Serializer):
    violation = OfficerViolationReviewDetailSerializer()
    fine_reference_number = serializers.CharField(allow_null=True)
    message = serializers.CharField()


class OfficerEvidenceListSerializer(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_code = serializers.CharField(source='camera.code', read_only=True)
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)
    evidence_image_url = serializers.SerializerMethodField()
    detection_image_url = serializers.SerializerMethodField()
    has_evidence = serializers.SerializerMethodField()

    class Meta:
        model = Violation
        fields = (
            'id',
            'status',
            'detected_at',
            'driver_name',
            'vehicle_plate',
            'camera_name',
            'camera_code',
            'traffic_sign_code',
            'traffic_sign_name',
            'evidence_image_url',
            'detection_image_url',
            'has_evidence',
        )
        read_only_fields = fields

    def get_driver_name(self, obj: Violation) -> str:
        return obj.driver.get_full_name() or obj.driver.email

    def get_evidence_image_url(self, obj: Violation) -> str | None:
        if not obj.evidence_image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.evidence_image.url)
        return obj.evidence_image.url

    def get_detection_image_url(self, obj: Violation) -> str | None:
        image = obj.detection.image
        if not image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(image.url)
        return image.url

    def get_has_evidence(self, obj: Violation) -> bool:
        return bool(obj.evidence_image) or bool(obj.detection.image)


class OfficerEvidenceDetailSerializer(OfficerEvidenceListSerializer):
    detection_id = serializers.IntegerField(source='detection.id', read_only=True)
    detection_confidence = serializers.FloatField(source='detection.confidence', read_only=True)
    bounding_box = serializers.JSONField(source='detection.bounding_box', read_only=True)
    driver_email = serializers.EmailField(source='driver.email', read_only=True)
    vehicle_make = serializers.CharField(source='vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    vehicle_year = serializers.IntegerField(source='vehicle.year', read_only=True)
    vehicle_color = serializers.CharField(source='vehicle.color', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    station_name = serializers.CharField(source='camera.station.name', read_only=True, allow_null=True)
    traffic_sign_name_km = serializers.CharField(source='traffic_sign.name_km', read_only=True)
    fine_amount = serializers.DecimalField(
        source='traffic_sign.fine_amount',
        max_digits=12,
        decimal_places=0,
        read_only=True,
    )
    officer_notes = serializers.CharField(read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True, allow_null=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta(OfficerEvidenceListSerializer.Meta):
        fields = OfficerEvidenceListSerializer.Meta.fields + (
            'detection_id',
            'detection_confidence',
            'bounding_box',
            'driver_email',
            'vehicle_make',
            'vehicle_model',
            'vehicle_year',
            'vehicle_color',
            'camera_location',
            'station_name',
            'traffic_sign_name_km',
            'fine_amount',
            'officer_notes',
            'reviewed_by_email',
            'reviewed_at',
        )


class DriverViolationListSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_code = serializers.CharField(source='camera.code', read_only=True)
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)
    fine_amount = serializers.DecimalField(
        source='traffic_sign.fine_amount',
        max_digits=12,
        decimal_places=0,
        read_only=True,
    )
    evidence_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Violation
        fields = (
            'id',
            'status',
            'detected_at',
            'vehicle_plate',
            'camera_name',
            'camera_code',
            'traffic_sign_code',
            'traffic_sign_name',
            'fine_amount',
            'evidence_image_url',
        )
        read_only_fields = fields

    def get_evidence_image_url(self, obj: Violation) -> str | None:
        if not obj.evidence_image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.evidence_image.url)
        return obj.evidence_image.url


class DriverViolationDetailSerializer(DriverViolationListSerializer):
    detection_id = serializers.IntegerField(source='detection.id', read_only=True)
    detection_confidence = serializers.FloatField(source='detection.confidence', read_only=True)
    detection_image_url = serializers.SerializerMethodField()
    vehicle_make = serializers.CharField(source='vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    vehicle_year = serializers.IntegerField(source='vehicle.year', read_only=True)
    vehicle_color = serializers.CharField(source='vehicle.color', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    station_name = serializers.CharField(source='camera.station.name', read_only=True, allow_null=True)
    traffic_sign_name_km = serializers.CharField(source='traffic_sign.name_km', read_only=True)
    officer_notes = serializers.CharField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    fine_reference_number = serializers.SerializerMethodField()
    fine_status = serializers.SerializerMethodField()
    issued_fine_amount = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta(DriverViolationListSerializer.Meta):
        fields = DriverViolationListSerializer.Meta.fields + (
            'detection_id',
            'detection_confidence',
            'detection_image_url',
            'vehicle_make',
            'vehicle_model',
            'vehicle_year',
            'vehicle_color',
            'camera_location',
            'station_name',
            'traffic_sign_name_km',
            'officer_notes',
            'reviewed_at',
            'fine_reference_number',
            'fine_status',
            'issued_fine_amount',
            'created_at',
            'updated_at',
        )

    def get_detection_image_url(self, obj: Violation) -> str | None:
        image = obj.detection.image
        if not image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(image.url)
        return image.url

    def get_fine_reference_number(self, obj: Violation) -> str | None:
        fine = getattr(obj, 'fine', None)
        return fine.reference_number if fine is not None else None

    def get_fine_status(self, obj: Violation) -> str | None:
        fine = getattr(obj, 'fine', None)
        return fine.status if fine is not None else None

    def get_issued_fine_amount(self, obj: Violation) -> int | None:
        fine = getattr(obj, 'fine', None)
        return int(fine.amount) if fine is not None else None

