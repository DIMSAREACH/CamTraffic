from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class ProfileSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.CharField(read_only=True)
    is_email_verified = serializers.BooleanField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    locale = serializers.ChoiceField(choices=UserProfile.Locale.choices, required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    province = serializers.CharField(max_length=100, required=False, allow_blank=True)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_avatar_url(self, user) -> str | None:
        if not user.avatar:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(user.avatar.url)
        return user.avatar.url

    def to_representation(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return {
            'id': str(user.pk),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'role': user.role,
            'is_email_verified': user.is_email_verified,
            'avatar_url': self.get_avatar_url(user),
            'locale': profile.locale,
            'bio': profile.bio,
            'address': profile.address,
            'province': profile.province,
            'district': profile.district,
            'date_of_birth': profile.date_of_birth.isoformat() if profile.date_of_birth else None,
            'created_at': user.date_joined,
            'updated_at': profile.updated_at or user.date_joined,
        }

    def update(self, user, validated_data):
        profile, _ = UserProfile.objects.get_or_create(user=user)

        user_fields = []
        for field in ('first_name', 'last_name', 'phone'):
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
                user_fields.append(field)
        if user_fields:
            user.save(update_fields=user_fields)

        profile_fields = []
        for field in ('locale', 'bio', 'address', 'province', 'district', 'date_of_birth'):
            if field in validated_data:
                setattr(profile, field, validated_data[field])
                profile_fields.append(field)
        if profile_fields:
            profile.save(update_fields=profile_fields)

        return user


ALLOWED_AVATAR_CONTENT_TYPES = ('image/jpeg', 'image/png', 'image/webp')
MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField()

    def validate_avatar(self, value):
        if value.size > MAX_AVATAR_SIZE_BYTES:
            raise serializers.ValidationError('Avatar file size must be 2MB or less.')
        content_type = getattr(value, 'content_type', None)
        if content_type and content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
            raise serializers.ValidationError('Avatar must be a JPEG, PNG, or WebP image.')
        return value


class UserManageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'phone',
            'role',
            'is_active',
            'is_email_verified',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    @staticmethod
    def get_updated_at(obj):
        return obj.last_login or obj.date_joined


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'role', 'is_active', 'password')

    def validate_email(self, value: str):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'ChangeMe123!'
        user = User(**validated_data)
        user.username = validated_data['email']
        user.set_password(password)
        user.save()
        return user
