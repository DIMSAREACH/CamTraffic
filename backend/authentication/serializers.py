from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from users.serializers import UserSerializer

from .login_messages import (
    LOGIN_ACCOUNT_DEACTIVATED,
    LOGIN_ADMIN_ON_USER_PORTAL,
    LOGIN_INVALID_CREDENTIALS,
    LOGIN_NON_ADMIN_ON_ADMIN_PORTAL,
    LOGIN_WRONG_DRIVER_TAB,
    LOGIN_WRONG_OFFICER_TAB,
)
from .password_policy import validate_strong_password

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        return token

    def _portal_role_checks(self):
        """Enforce portal + optional role tab against the authenticated user's role."""
        request = self.context.get('request')
        if not request:
            return

        portal = (request.data.get('portal') or '').strip().lower()
        expected_role = (request.data.get('role') or '').strip().lower()

        if portal == 'admin':
            if self.user.role != 'admin':
                raise serializers.ValidationError({'portal': LOGIN_NON_ADMIN_ON_ADMIN_PORTAL})
            return

        if portal == 'user':
            if self.user.role == 'admin':
                raise serializers.ValidationError({'portal': LOGIN_ADMIN_ON_USER_PORTAL})
            if self.user.role not in ('police', 'driver'):
                raise serializers.ValidationError({'portal': LOGIN_INVALID_CREDENTIALS})
            if expected_role in ('police', 'driver') and self.user.role != expected_role:
                msg = LOGIN_WRONG_OFFICER_TAB if self.user.role == 'police' else LOGIN_WRONG_DRIVER_TAB
                raise serializers.ValidationError({'role': msg})

    def validate(self, attrs):
        email = (attrs.get(self.username_field) or '').strip().lower()
        if email:
            attrs[self.username_field] = email
            existing = User.objects.filter(email__iexact=email).first()
            if existing and not existing.is_active:
                raise serializers.ValidationError(LOGIN_ACCOUNT_DEACTIVATED)

        try:
            data = super().validate(attrs)
        except serializers.ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and 'non_field_errors' in detail:
                raise serializers.ValidationError(LOGIN_INVALID_CREDENTIALS) from exc
            if isinstance(detail, list):
                raise serializers.ValidationError(LOGIN_INVALID_CREDENTIALS) from exc
            raise

        if not self.user.is_active:
            raise serializers.ValidationError(LOGIN_ACCOUNT_DEACTIVATED)
        self._portal_role_checks()
        data['user'] = UserSerializer(self.user, context=self.context).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('full_name', 'email', 'password', 'password_confirm', 'phone', 'address', 'license_no')

    def validate_password(self, value):
        validate_strong_password(value)
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        user = User(
            email=validated_data['email'].strip().lower(),
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', ''),
            license_no=validated_data.get('license_no', ''),
            role='driver',
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError('Invalid reset link.')
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError('Invalid or expired token.')
        validate_strong_password(attrs['new_password'], user=user, field_name='new_password')
        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        user = self.context['request'].user
        validate_strong_password(value, user=user, field_name='new_password')
        return value
