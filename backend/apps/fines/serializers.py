from rest_framework import serializers

from .models import Fine, FinePayment


class DriverFineListSerializer(serializers.ModelSerializer):
    violation_id = serializers.IntegerField(source='violation.id', read_only=True)
    vehicle_plate = serializers.CharField(source='violation.vehicle.plate_number', read_only=True)
    traffic_sign_code = serializers.CharField(source='violation.traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='violation.traffic_sign.name_en', read_only=True)
    detected_at = serializers.DateTimeField(source='violation.detected_at', read_only=True)

    class Meta:
        model = Fine
        fields = (
            'id',
            'reference_number',
            'amount',
            'currency',
            'status',
            'due_date',
            'paid_at',
            'violation_id',
            'vehicle_plate',
            'traffic_sign_code',
            'traffic_sign_name',
            'detected_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class DriverFineDetailSerializer(DriverFineListSerializer):
    violation_status = serializers.CharField(source='violation.status', read_only=True)
    vehicle_make = serializers.CharField(source='violation.vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='violation.vehicle.model', read_only=True)
    vehicle_year = serializers.IntegerField(source='violation.vehicle.year', read_only=True)
    camera_name = serializers.CharField(source='violation.camera.name', read_only=True)
    camera_code = serializers.CharField(source='violation.camera.code', read_only=True)
    camera_location = serializers.CharField(source='violation.camera.location', read_only=True)
    station_name = serializers.CharField(source='violation.camera.station.name', read_only=True, allow_null=True)
    traffic_sign_name_km = serializers.CharField(source='violation.traffic_sign.name_km', read_only=True)
    officer_notes = serializers.CharField(source='violation.officer_notes', read_only=True)
    can_pay = serializers.SerializerMethodField()

    class Meta(DriverFineListSerializer.Meta):
        fields = DriverFineListSerializer.Meta.fields + (
            'violation_status',
            'vehicle_make',
            'vehicle_model',
            'vehicle_year',
            'camera_name',
            'camera_code',
            'camera_location',
            'station_name',
            'traffic_sign_name_km',
            'officer_notes',
            'can_pay',
        )

    def get_can_pay(self, fine: Fine) -> bool:
        return fine.status in (Fine.Status.UNPAID, Fine.Status.OVERDUE)


class DriverFinePaymentSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=FinePayment.Method.choices)
    transaction_id = serializers.CharField(required=False, allow_blank=True, max_length=100)


class DriverFinePaymentResultSerializer(serializers.Serializer):
    fine = DriverFineDetailSerializer()
    payment_id = serializers.IntegerField()
    message = serializers.CharField()


class DriverFinePaymentRecordSerializer(serializers.ModelSerializer):
    fine_id = serializers.IntegerField(source='fine.id', read_only=True)
    fine_reference_number = serializers.CharField(source='fine.reference_number', read_only=True)
    currency = serializers.CharField(source='fine.currency', read_only=True)
    vehicle_plate = serializers.CharField(source='fine.violation.vehicle.plate_number', read_only=True)
    traffic_sign_code = serializers.CharField(source='fine.violation.traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='fine.violation.traffic_sign.name_en', read_only=True)

    class Meta:
        model = FinePayment
        fields = (
            'id',
            'fine_id',
            'fine_reference_number',
            'amount',
            'currency',
            'method',
            'transaction_id',
            'paid_at',
            'vehicle_plate',
            'traffic_sign_code',
            'traffic_sign_name',
            'created_at',
        )
        read_only_fields = fields


class DriverFinePaymentDetailSerializer(DriverFinePaymentRecordSerializer):
    violation_id = serializers.IntegerField(source='fine.violation.id', read_only=True)
    vehicle_make = serializers.CharField(source='fine.violation.vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='fine.violation.vehicle.model', read_only=True)
    vehicle_year = serializers.IntegerField(source='fine.violation.vehicle.year', read_only=True)
    detected_at = serializers.DateTimeField(source='fine.violation.detected_at', read_only=True)
    camera_name = serializers.CharField(source='fine.violation.camera.name', read_only=True)
    camera_code = serializers.CharField(source='fine.violation.camera.code', read_only=True)
    station_name = serializers.CharField(
        source='fine.violation.camera.station.name',
        read_only=True,
        allow_null=True,
    )

    class Meta(DriverFinePaymentRecordSerializer.Meta):
        fields = DriverFinePaymentRecordSerializer.Meta.fields + (
            'violation_id',
            'vehicle_make',
            'vehicle_model',
            'vehicle_year',
            'detected_at',
            'camera_name',
            'camera_code',
            'station_name',
        )
