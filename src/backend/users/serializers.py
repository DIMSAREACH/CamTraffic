from authentication.password_policy import validate_strong_password
from rest_framework import serializers

from .models import User
from .profile_services import ProfileValidationError, provision_user_account, validate_unique_badge_no, validate_unique_license_no


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'role', 'phone', 'address',
            'license_no', 'profile_image', 'email_verified', 'created_at', 'updated_at', 'last_login',
            'auth_provider', 'is_active', 'deleted_at', 'is_superuser',
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'last_login', 'role',
            'auth_provider', 'email_verified', 'deleted_at', 'is_superuser',
        )


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    badge_no = serializers.CharField(required=False, allow_blank=True, max_length=50)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'password', 'role', 'phone',
            'address', 'license_no', 'badge_no', 'is_active',
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

        attrs['_badge_no'] = badge_no
        return attrs

    def create(self, validated_data):
        badge_no = validated_data.pop('_badge_no', '')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        provision_user_account(
            user,
            badge_no=badge_no or None,
            license_no=user.license_no or None,
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'phone', 'address', 'license_no', 'profile_image')

    def validate_license_no(self, value):
        user = self.instance
        license_no = (value or '').strip()
        if user and user.role == 'driver' and license_no:
            try:
                validate_unique_license_no(license_no, exclude_user_id=user.id)
            except ProfileValidationError as exc:
                raise serializers.ValidationError(exc.message) from exc
        return value

    def update(self, instance, validated_data):
        user = super().update(instance, validated_data)
        if user.role == 'driver' and 'license_no' in validated_data:
            from .profile_services import provision_user_account

            provision_user_account(user, license_no=user.license_no)
        return user
