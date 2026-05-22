from authentication.password_policy import validate_strong_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'role', 'phone', 'address',
            'license_no', 'profile_image', 'created_at', 'is_active',
        )
        read_only_fields = ('id', 'created_at', 'role')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'email', 'password', 'role', 'phone',
            'address', 'license_no', 'is_active',
        )
        read_only_fields = ('id',)

    def validate_password(self, value):
        validate_strong_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'phone', 'address', 'license_no', 'profile_image')
