from authentication.password_policy import validate_strong_password
from rest_framework import serializers

from core.cambodia_identity import is_valid_license, is_valid_plate, normalize_license, normalize_plate

from .models import User
from .profile_services import ProfileValidationError, provision_user_account, validate_unique_badge_no, validate_unique_license_no


def _driver_plate_number(user: User) -> str:
    from vehicles.models import Vehicle

    vehicle = (
        Vehicle.objects.filter(owner_id=user.id)
        .order_by('-created_at')
        .only('plate_number')
        .first()
    )
    return normalize_plate((vehicle.plate_number if vehicle else '') or '')


def _upsert_driver_plate(user: User, plate_number: str) -> None:
    """Create/update the driver's primary registered vehicle plate."""
    from vehicles.models import Vehicle

    plate = normalize_plate(plate_number)
    if user.role != 'driver':
        return
    if not plate:
        return
    if not is_valid_plate(plate):
        raise serializers.ValidationError({
            'plate_number': f'Plate must match Cambodia format (e.g. 2CO-5410), got {plate!r}.',
        })

    provision_user_account(user, license_no=user.license_no or None)
    driver = getattr(user, 'driver_profile', None)
    existing = Vehicle.objects.filter(owner_id=user.id).order_by('-created_at').first()
    clash = Vehicle.objects.filter(plate_number__iexact=plate)
    if existing:
        clash = clash.exclude(pk=existing.pk)
    if clash.exists():
        raise serializers.ValidationError({
            'plate_number': f'Plate {plate} is already registered to another vehicle.',
        })

    if existing:
        existing.plate_number = plate
        if driver and not existing.driver_id:
            existing.driver = driver
            existing.save(update_fields=['plate_number', 'driver'])
        else:
            existing.save(update_fields=['plate_number'])
        return

    Vehicle.objects.create(
        owner=user,
        driver=driver,
        plate_number=plate,
        vehicle_type='car',
        make='Toyota',
        model='Registered Vehicle',
        color='White',
        year=2024,
        status='active',
    )


class UserSerializer(serializers.ModelSerializer):
    plate_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'role', 'phone', 'address',
            'license_no', 'plate_number', 'profile_image', 'email_verified',
            'created_at', 'updated_at', 'last_login',
            'auth_provider', 'is_active', 'deleted_at', 'is_superuser',
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'last_login', 'role',
            'auth_provider', 'email_verified', 'deleted_at', 'is_superuser',
            'plate_number',
        )

    def get_plate_number(self, obj):
        if obj.role != 'driver':
            return ''
        return _driver_plate_number(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('license_no'):
            data['license_no'] = normalize_license(data['license_no'])
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    badge_no = serializers.CharField(required=False, allow_blank=True, max_length=50)
    plate_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'password', 'role', 'phone',
            'address', 'license_no', 'plate_number', 'badge_no', 'is_active',
        )
        read_only_fields = ('id',)
        extra_kwargs = {
            'email': {'validators': []},
        }

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                'An account with this email already exists. '
                'Please sign in or use a different email.',
            )
        return email

    def validate_password(self, value):
        validate_strong_password(value)
        return value

    def validate_plate_number(self, value):
        plate = normalize_plate(value)
        if plate and not is_valid_plate(plate):
            raise serializers.ValidationError(
                f'Plate must match Cambodia format (e.g. 2TE-1507), got {plate!r}.',
            )
        return plate

    def validate_license_no(self, value):
        lic = normalize_license(value)
        if lic and not is_valid_license(lic):
            raise serializers.ValidationError(
                f'License must match Cambodia format (e.g. 2TE-1507), got {lic!r}.',
            )
        return lic

    def validate(self, attrs):
        role = attrs.get('role', 'driver')
        request = self.context.get('request')
        actor = getattr(request, 'user', None) if request else None
        if role == 'admin' and not (actor and getattr(actor, 'is_superuser', False)):
            raise serializers.ValidationError({
                'role': 'Only a super administrator can create administrator accounts.',
            })

        license_no = (attrs.get('license_no') or '').strip()
        badge_no = (attrs.pop('badge_no', '') or '').strip()
        plate_number = attrs.pop('plate_number', '') or ''

        if role == 'driver' and license_no:
            try:
                validate_unique_license_no(license_no)
            except ProfileValidationError as exc:
                raise serializers.ValidationError({exc.field: exc.message}) from exc

        if role == 'police' and badge_no:
            try:
                validate_unique_badge_no(badge_no)
            except ProfileValidationError as exc:
                raise serializers.ValidationError({exc.field: exc.message}) from exc

        if role == 'driver' and plate_number:
            from vehicles.models import Vehicle
            if Vehicle.objects.filter(plate_number__iexact=plate_number).exists():
                raise serializers.ValidationError({
                    'plate_number': f'Plate {plate_number} is already registered.',
                })

        attrs['_badge_no'] = badge_no
        attrs['_plate_number'] = plate_number
        return attrs

    def create(self, validated_data):
        badge_no = validated_data.pop('_badge_no', '')
        plate_number = validated_data.pop('_plate_number', '')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        provision_user_account(
            user,
            badge_no=badge_no or None,
            license_no=user.license_no or None,
        )
        if plate_number:
            _upsert_driver_plate(user, plate_number)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Self-service profile fields + admin email/role when actor is admin."""

    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    plate_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model = User
        fields = (
            'full_name', 'phone', 'address', 'license_no', 'plate_number',
            'profile_image', 'email', 'role',
        )
        extra_kwargs = {
            'email': {'validators': []},
            'license_no': {'allow_blank': True, 'required': False},
            'plate_number': {'allow_blank': True, 'required': False},
        }

    def _actor(self):
        request = self.context.get('request')
        return getattr(request, 'user', None) if request else None

    def validate_email(self, value):
        email = (value or '').strip().lower()
        user = self.instance
        qs = User.objects.filter(email__iexact=email)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'An account with this email already exists.',
            )
        return email

    def validate_license_no(self, value):
        lic = normalize_license(value)
        if lic and not is_valid_license(lic):
            raise serializers.ValidationError(
                f'License must match Cambodia format (e.g. 2TE-1507), got {lic!r}.',
            )
        return lic

    def validate_plate_number(self, value):
        plate = normalize_plate(value)
        if plate and not is_valid_plate(plate):
            raise serializers.ValidationError(
                f'Plate must match Cambodia format (e.g. 2TE-1507), got {plate!r}.',
            )
        return plate

    def validate(self, attrs):
        actor = self._actor()
        is_admin = bool(actor and getattr(actor, 'role', None) == 'admin')

        if 'email' in attrs and not is_admin:
            raise serializers.ValidationError({
                'email': 'Only administrators can change account email.',
            })
        if 'role' in attrs and not is_admin:
            raise serializers.ValidationError({
                'role': 'Only administrators can change account role.',
            })

        new_role = attrs.get('role')
        if new_role == 'admin' and not (actor and getattr(actor, 'is_superuser', False)):
            raise serializers.ValidationError({
                'role': 'Only a super administrator can assign the administrator role.',
            })

        if 'license_no' in attrs:
            lic = attrs.get('license_no') or ''
            effective_role = attrs.get('role') or (self.instance.role if self.instance else 'driver')
            if self.instance and effective_role == 'driver' and lic:
                try:
                    validate_unique_license_no(lic, exclude_user_id=self.instance.id)
                except ProfileValidationError as exc:
                    raise serializers.ValidationError({'license_no': exc.message}) from exc

        return attrs

    def update(self, instance, validated_data):
        plate_number = validated_data.pop('plate_number', None)
        role_changed = 'role' in validated_data and validated_data['role'] != instance.role
        user = super().update(instance, validated_data)
        if role_changed or (user.role == 'driver' and 'license_no' in validated_data):
            provision_user_account(user, license_no=user.license_no or None)
        if plate_number is not None and user.role == 'driver':
            _upsert_driver_plate(user, plate_number)
        return user
