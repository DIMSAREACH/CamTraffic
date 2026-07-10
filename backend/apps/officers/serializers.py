from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Officer, PoliceStation

User = get_user_model()


class PoliceStationOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceStation
        fields = ('id', 'code', 'name', 'province', 'is_active')
        read_only_fields = fields


class PoliceStationManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceStation
        fields = (
            'id',
            'code',
            'name',
            'name_km',
            'address',
            'province',
            'district',
            'phone',
            'latitude',
            'longitude',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_code(self, value: str) -> str:
        code = value.strip().upper()
        queryset = PoliceStation.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A police station with this code already exists.')
        return code


class PoliceStationCreateSerializer(PoliceStationManageSerializer):
    class Meta(PoliceStationManageSerializer.Meta):
        read_only_fields = ('id', 'created_at', 'updated_at')


class PoliceStationUpdateSerializer(PoliceStationManageSerializer):
    class Meta(PoliceStationManageSerializer.Meta):
        read_only_fields = ('id', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('code', 'name', 'address', 'province'):
            self.fields[field_name].required = False


class OfficerManageSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    station_id = serializers.IntegerField(source='station.id', read_only=True)
    station_code = serializers.CharField(source='station.code', read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True)

    class Meta:
        model = Officer
        fields = (
            'id',
            'user_id',
            'email',
            'first_name',
            'last_name',
            'phone',
            'badge_number',
            'rank',
            'hire_date',
            'station_id',
            'station_code',
            'station_name',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class OfficerCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False, trim_whitespace=False)
    badge_number = serializers.CharField(max_length=30)
    station_id = serializers.IntegerField(min_value=1)
    rank = serializers.CharField(max_length=50, required=False, allow_blank=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_badge_number(self, value: str) -> str:
        badge_number = value.strip()
        if Officer.objects.filter(badge_number__iexact=badge_number).exists():
            raise serializers.ValidationError('An officer with this badge number already exists.')
        return badge_number

    def validate_station_id(self, value: int) -> int:
        if not PoliceStation.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('Selected police station is invalid or inactive.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'ChangeMe123!'
        station_id = validated_data.pop('station_id')
        badge_number = validated_data.pop('badge_number')
        rank = validated_data.pop('rank', '')
        hire_date = validated_data.pop('hire_date', None)
        is_active = validated_data.pop('is_active', True)

        user = User(
            email=validated_data['email'],
            username=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role=User.Role.OFFICER,
            is_active=is_active,
        )
        user.set_password(password)
        user.save()

        officer = Officer.objects.create(
            user=user,
            station_id=station_id,
            badge_number=badge_number,
            rank=rank,
            hire_date=hire_date,
            is_active=is_active,
        )
        return officer


class OfficerUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    badge_number = serializers.CharField(max_length=30, required=False)
    station_id = serializers.IntegerField(min_value=1, required=False)
    rank = serializers.CharField(max_length=50, required=False, allow_blank=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    def validate_badge_number(self, value: str) -> str:
        badge_number = value.strip()
        officer = self.context.get('officer')
        if officer and Officer.objects.filter(badge_number__iexact=badge_number).exclude(id=officer.id).exists():
            raise serializers.ValidationError('An officer with this badge number already exists.')
        return badge_number

    def validate_station_id(self, value: int) -> int:
        if not PoliceStation.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('Selected police station is invalid or inactive.')
        return value

    def update(self, officer: Officer, validated_data):
        user = officer.user
        user_fields = []
        for field in ('first_name', 'last_name', 'phone'):
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
                user_fields.append(field)

        officer_fields = []
        for field in ('badge_number', 'rank', 'hire_date', 'is_active'):
            if field in validated_data:
                setattr(officer, field, validated_data.pop(field))
                officer_fields.append(field)

        if 'station_id' in validated_data:
            officer.station_id = validated_data.pop('station_id')
            officer_fields.append('station')

        if 'is_active' in officer_fields:
            user.is_active = officer.is_active
            user_fields.append('is_active')

        if user_fields:
            user.save(update_fields=user_fields)
        if officer_fields:
            officer.save(update_fields=officer_fields)

        return officer


class OfficerProfileSerializer(serializers.ModelSerializer):
    station_id = serializers.IntegerField(source='station.id', read_only=True)
    station_code = serializers.CharField(source='station.code', read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True)
    station_province = serializers.CharField(source='station.province', read_only=True)
    station_address = serializers.CharField(source='station.address', read_only=True)

    class Meta:
        model = Officer
        fields = (
            'id',
            'badge_number',
            'rank',
            'hire_date',
            'station_id',
            'station_code',
            'station_name',
            'station_province',
            'station_address',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class OfficerProfileUpdateSerializer(serializers.Serializer):
    rank = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def update(self, officer: Officer, validated_data):
        officer.rank = validated_data.get('rank', officer.rank)
        officer.save(update_fields=['rank', 'updated_at'])
        return officer
