from rest_framework import serializers

from users.models import Driver, Officer, User

from .profile_services import ProfileValidationError, validate_unique_badge_no, validate_unique_license_no


class OfficerSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True, default=None)

    class Meta:
        model = Officer
        fields = (
            'id', 'user_id', 'full_name', 'email', 'phone',
            'badge_no', 'rank', 'department', 'status', 'station', 'station_name',
            'created_at',
        )
        read_only_fields = ('id', 'user_id', 'full_name', 'email', 'phone', 'created_at', 'station_name')


class OfficerCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    badge_no = serializers.CharField(max_length=50)
    rank = serializers.CharField(required=False, allow_blank=True, max_length=100)
    department = serializers.CharField(required=False, allow_blank=True, max_length=150)
    station = serializers.UUIDField(required=False, allow_null=True)

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def validate_badge_no(self, value):
        badge_no = (value or '').strip()
        try:
            validate_unique_badge_no(badge_no)
        except ProfileValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return badge_no

    def create(self, validated_data):
        from authentication.password_policy import validate_strong_password
        from users.profile_services import provision_user_account

        validate_strong_password(validated_data['password'])
        station_id = validated_data.pop('station', None)
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            role='police',
        )
        provision_user_account(user, badge_no=validated_data['badge_no'])
        officer = Officer.objects.get(user=user)
        officer.rank = validated_data.get('rank', officer.rank)
        officer.department = validated_data.get('department', officer.department)
        if station_id:
            from infrastructure.models import PoliceStation

            officer.station = PoliceStation.objects.filter(pk=station_id).first()
        officer.save()
        return officer


class OfficerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Officer
        fields = ('badge_no', 'rank', 'department', 'status', 'station')

    def validate_badge_no(self, value):
        badge_no = (value or '').strip()
        try:
            validate_unique_badge_no(badge_no, exclude_user_id=self.instance.user_id)
        except ProfileValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return badge_no


class DriverSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = Driver
        fields = (
            'id', 'user_id', 'full_name', 'email', 'phone',
            'license_no', 'national_id', 'license_expiry', 'date_of_birth',
            'kyc_status', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user_id', 'full_name', 'email', 'phone', 'created_at', 'updated_at')


class DriverCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    address = serializers.CharField(required=False, allow_blank=True)
    license_no = serializers.CharField(max_length=50)

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def validate_license_no(self, value):
        license_no = (value or '').strip()
        try:
            validate_unique_license_no(license_no)
        except ProfileValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return license_no

    def create(self, validated_data):
        from authentication.password_policy import validate_strong_password
        from users.profile_services import provision_user_account

        validate_strong_password(validated_data['password'])
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', ''),
            license_no=validated_data['license_no'],
            role='driver',
        )
        provision_user_account(user, license_no=validated_data['license_no'])
        return Driver.objects.get(user=user)


class DriverUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = (
            'license_no', 'national_id', 'license_expiry', 'date_of_birth',
            'kyc_status', 'status',
        )

    def validate_license_no(self, value):
        license_no = (value or '').strip()
        try:
            validate_unique_license_no(license_no, exclude_user_id=self.instance.user_id)
        except ProfileValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return license_no

    def update(self, instance, validated_data):
        driver = super().update(instance, validated_data)
        if 'license_no' in validated_data:
            user = instance.user
            user.license_no = driver.license_no
            user.save(update_fields=['license_no', 'updated_at'])
        return driver
