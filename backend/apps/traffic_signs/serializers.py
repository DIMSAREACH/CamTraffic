from rest_framework import serializers

from .models import SignCategory, TrafficSign


class SignCategoryOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignCategory
        fields = ('id', 'code', 'name_en', 'name_km', 'is_active')
        read_only_fields = fields


class SignCategoryManageSerializer(serializers.ModelSerializer):
    sign_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SignCategory
        fields = (
            'id',
            'code',
            'name_en',
            'name_km',
            'description',
            'is_active',
            'sign_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'sign_count', 'created_at', 'updated_at')

    def validate_code(self, value: str) -> str:
        code = value.strip().upper()
        queryset = SignCategory.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A sign category with this code already exists.')
        return code


class SignCategoryCreateSerializer(SignCategoryManageSerializer):
    class Meta(SignCategoryManageSerializer.Meta):
        read_only_fields = ('id', 'sign_count', 'created_at', 'updated_at')


class SignCategoryUpdateSerializer(SignCategoryManageSerializer):
    class Meta(SignCategoryManageSerializer.Meta):
        read_only_fields = ('id', 'sign_count', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('code', 'name_en', 'name_km'):
            self.fields[field_name].required = False


class TrafficSignManageSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source='category.id', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TrafficSign
        fields = (
            'id',
            'code',
            'name_en',
            'name_km',
            'category_id',
            'category_code',
            'category_name',
            'description',
            'image_url',
            'fine_amount',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'image_url', 'created_at', 'updated_at')

    def get_image_url(self, obj: TrafficSign) -> str | None:
        if not obj.image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def validate_code(self, value: str) -> str:
        code = value.strip().upper()
        queryset = TrafficSign.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A traffic sign with this code already exists.')
        return code


class TrafficSignCreateSerializer(TrafficSignManageSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=SignCategory.objects.filter(is_active=True),
    )

    class Meta(TrafficSignManageSerializer.Meta):
        read_only_fields = ('id', 'category_code', 'category_name', 'image_url', 'created_at', 'updated_at')


class TrafficSignUpdateSerializer(TrafficSignManageSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=SignCategory.objects.all(),
        required=False,
    )

    class Meta(TrafficSignManageSerializer.Meta):
        read_only_fields = ('id', 'category_code', 'category_name', 'image_url', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('code', 'name_en', 'name_km', 'category_id'):
            if field_name in self.fields:
                self.fields[field_name].required = False
