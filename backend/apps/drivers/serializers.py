from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import serializers

from apps.vehicles.models import Vehicle

from .models import Driver

User = get_user_model()


class OfficerDriverVehicleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ('id', 'plate_number', 'make', 'model', 'year', 'color', 'is_active')
        read_only_fields = fields


class OfficerDriverManageSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    vehicle_count = serializers.IntegerField(read_only=True)
    station_violation_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Driver
        fields = (
            'id',
            'user_id',
            'email',
            'first_name',
            'last_name',
            'phone',
            'license_number',
            'license_class',
            'license_expiry',
            'national_id',
            'vehicle_count',
            'station_violation_count',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class OfficerDriverManageDetailSerializer(OfficerDriverManageSerializer):
    vehicles = serializers.SerializerMethodField()

    class Meta(OfficerDriverManageSerializer.Meta):
        fields = OfficerDriverManageSerializer.Meta.fields + ('vehicles',)
        read_only_fields = fields

    def get_vehicles(self, driver: Driver):
        vehicles = Vehicle.objects.filter(owner_id=driver.user_id).order_by('plate_number')
        return OfficerDriverVehicleSummarySerializer(vehicles, many=True).data


class OfficerDriverCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False, trim_whitespace=False)
    license_number = serializers.CharField(max_length=30)
    license_class = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_license_number(self, value: str) -> str:
        license_number = value.strip().upper()
        if Driver.objects.filter(license_number__iexact=license_number).exists():
            raise serializers.ValidationError('A driver with this license number already exists.')
        return license_number

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'ChangeMe123!'
        license_number = validated_data.pop('license_number')
        license_class = validated_data.pop('license_class', '')
        license_expiry = validated_data.pop('license_expiry', None)
        national_id = validated_data.pop('national_id', '')
        is_active = validated_data.pop('is_active', True)

        user = User(
            email=validated_data['email'],
            username=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role=User.Role.DRIVER,
            is_active=is_active,
        )
        user.set_password(password)
        user.save()

        return Driver.objects.create(
            user=user,
            license_number=license_number,
            license_class=license_class,
            license_expiry=license_expiry,
            national_id=national_id,
            is_active=is_active,
        )


class OfficerDriverUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=30, required=False)
    license_class = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_license_number(self, value: str) -> str:
        license_number = value.strip().upper()
        driver = self.context.get('driver')
        if driver and Driver.objects.filter(license_number__iexact=license_number).exclude(id=driver.id).exists():
            raise serializers.ValidationError('A driver with this license number already exists.')
        return license_number

    def update(self, driver: Driver, validated_data):
        user = driver.user
        user_fields = []
        for field in ('first_name', 'last_name', 'phone'):
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
                user_fields.append(field)

        driver_fields = []
        for field in ('license_number', 'license_class', 'license_expiry', 'national_id', 'is_active'):
            if field in validated_data:
                setattr(driver, field, validated_data.pop(field))
                driver_fields.append(field)

        if 'is_active' in driver_fields:
            user.is_active = driver.is_active
            user_fields.append('is_active')

        if user_fields:
            user.save(update_fields=user_fields)
        if driver_fields:
            driver.save(update_fields=driver_fields)

        return driver


class DriverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = (
            'id',
            'license_number',
            'license_class',
            'license_expiry',
            'national_id',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class DriverProfileUpdateSerializer(serializers.Serializer):
    national_id = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def update(self, driver: Driver, validated_data):
        driver.national_id = validated_data.get('national_id', driver.national_id)
        driver.save(update_fields=['national_id', 'updated_at'])
        return driver


class DriverSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = (
            'notify_email',
            'notify_violations',
            'notify_fines',
            'notify_appeals',
            'updated_at',
        )
        read_only_fields = fields


class DriverSettingsUpdateSerializer(serializers.Serializer):
    notify_email = serializers.BooleanField(required=False)
    notify_violations = serializers.BooleanField(required=False)
    notify_fines = serializers.BooleanField(required=False)
    notify_appeals = serializers.BooleanField(required=False)

    def update(self, driver: Driver, validated_data):
        fields = []
        for field in ('notify_email', 'notify_violations', 'notify_fines', 'notify_appeals'):
            if field in validated_data:
                setattr(driver, field, validated_data[field])
                fields.append(field)
        if fields:
            fields.append('updated_at')
            driver.save(update_fields=fields)
        return driver


def annotate_officer_driver_queryset(queryset, station_id: int):
    station_filter = Q(user__violations__camera__station_id=station_id)
    return queryset.annotate(
        vehicle_count=Count('user__vehicles', distinct=True),
        station_violation_count=Count('user__violations', filter=station_filter, distinct=True),
    )
