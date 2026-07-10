from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import serializers

from apps.violations.models import Violation

from .models import Vehicle

User = get_user_model()


class OfficerVehicleStationViolationSummarySerializer(serializers.ModelSerializer):
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)

    class Meta:
        model = Violation
        fields = ('id', 'status', 'detected_at', 'traffic_sign_code', 'traffic_sign_name')
        read_only_fields = fields


class OfficerVehicleManageSerializer(serializers.ModelSerializer):
    owner_id = serializers.CharField(source='owner.id', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_license_number = serializers.SerializerMethodField()
    station_violation_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id',
            'owner_id',
            'owner_email',
            'owner_name',
            'owner_license_number',
            'plate_number',
            'make',
            'model',
            'year',
            'color',
            'registration_date',
            'station_violation_count',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_owner_name(self, vehicle: Vehicle) -> str:
        return vehicle.owner.get_full_name() or vehicle.owner.email

    def get_owner_license_number(self, vehicle: Vehicle) -> str:
        profile = getattr(vehicle.owner, 'driver_profile', None)
        return profile.license_number if profile is not None else ''


class OfficerVehicleManageDetailSerializer(OfficerVehicleManageSerializer):
    station_violations = serializers.SerializerMethodField()

    class Meta(OfficerVehicleManageSerializer.Meta):
        fields = OfficerVehicleManageSerializer.Meta.fields + ('station_violations',)
        read_only_fields = fields

    def get_station_violations(self, vehicle: Vehicle):
        officer = self.context.get('officer')
        if officer is None:
            return []

        violations = (
            Violation.objects.filter(
                vehicle_id=vehicle.id,
                camera__station_id=officer.station_id,
            )
            .select_related('traffic_sign')
            .order_by('-detected_at')[:10]
        )
        return OfficerVehicleStationViolationSummarySerializer(violations, many=True).data


class OfficerVehicleCreateSerializer(serializers.Serializer):
    owner_id = serializers.CharField()
    plate_number = serializers.CharField(max_length=20)
    make = serializers.CharField(max_length=50)
    model = serializers.CharField(max_length=50)
    year = serializers.IntegerField(min_value=1900, max_value=2100)
    color = serializers.CharField(max_length=30, required=False, allow_blank=True)
    registration_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_owner_id(self, value: str) -> User:
        try:
            return User.objects.select_related('driver_profile').get(id=value, role=User.Role.DRIVER)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError('Selected owner must be a driver account.') from exc

    def validate_plate_number(self, value: str) -> str:
        plate_number = value.strip().upper()
        if Vehicle.objects.filter(plate_number__iexact=plate_number).exists():
            raise serializers.ValidationError('A vehicle with this plate number already exists.')
        return plate_number

    def create(self, validated_data):
        owner = validated_data.pop('owner_id')
        return Vehicle.objects.create(owner=owner, **validated_data)


class OfficerVehicleUpdateSerializer(serializers.Serializer):
    owner_id = serializers.CharField(required=False)
    plate_number = serializers.CharField(max_length=20, required=False)
    make = serializers.CharField(max_length=50, required=False)
    model = serializers.CharField(max_length=50, required=False)
    year = serializers.IntegerField(min_value=1900, max_value=2100, required=False)
    color = serializers.CharField(max_length=30, required=False, allow_blank=True)
    registration_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    def validate_owner_id(self, value: str) -> User:
        try:
            return User.objects.get(id=value, role=User.Role.DRIVER)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError('Selected owner must be a driver account.') from exc

    def validate_plate_number(self, value: str) -> str:
        plate_number = value.strip().upper()
        vehicle = self.context.get('vehicle')
        if vehicle and Vehicle.objects.filter(plate_number__iexact=plate_number).exclude(id=vehicle.id).exists():
            raise serializers.ValidationError('A vehicle with this plate number already exists.')
        return plate_number

    def update(self, vehicle: Vehicle, validated_data):
        if 'owner_id' in validated_data:
            vehicle.owner = validated_data.pop('owner_id')

        for field in ('plate_number', 'make', 'model', 'year', 'color', 'registration_date', 'is_active'):
            if field in validated_data:
                setattr(vehicle, field, validated_data.pop(field))

        vehicle.save()
        return vehicle


def annotate_officer_vehicle_queryset(queryset, station_id: int):
    station_filter = Q(violations__camera__station_id=station_id)
    return queryset.annotate(
        station_violation_count=Count('violations', filter=station_filter, distinct=True),
    )


class DriverVehicleViolationSummarySerializer(serializers.ModelSerializer):
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True)

    class Meta:
        model = Violation
        fields = ('id', 'status', 'detected_at', 'traffic_sign_code', 'traffic_sign_name')
        read_only_fields = fields


class DriverVehicleRecordSerializer(serializers.ModelSerializer):
    violation_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id',
            'plate_number',
            'make',
            'model',
            'year',
            'color',
            'registration_date',
            'violation_count',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class DriverVehicleDetailSerializer(DriverVehicleRecordSerializer):
    violations = serializers.SerializerMethodField()

    class Meta(DriverVehicleRecordSerializer.Meta):
        fields = DriverVehicleRecordSerializer.Meta.fields + ('violations',)
        read_only_fields = fields

    def get_violations(self, vehicle: Vehicle):
        violations = (
            Violation.objects.filter(vehicle_id=vehicle.id, driver_id=vehicle.owner_id)
            .select_related('traffic_sign')
            .order_by('-detected_at')[:10]
        )
        return DriverVehicleViolationSummarySerializer(violations, many=True).data


def annotate_driver_vehicle_queryset(queryset):
    return queryset.annotate(violation_count=Count('violations', distinct=True))
