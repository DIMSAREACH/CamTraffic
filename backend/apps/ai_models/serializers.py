from rest_framework import serializers

from .models import AIModel, AIModelVersion, AITrainingHistory


class AIModelManageSerializer(serializers.ModelSerializer):
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = AIModel
        fields = (
            'id',
            'name',
            'slug',
            'model_type',
            'description',
            'is_active',
            'version_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'version_count', 'created_at', 'updated_at')

    @staticmethod
    def get_version_count(obj: AIModel) -> int:
        return obj.versions.count()


class AIModelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ('name', 'slug', 'model_type', 'description', 'is_active')

    def validate_slug(self, value: str) -> str:
        slug = value.strip().lower()
        if AIModel.objects.filter(slug__iexact=slug).exists():
            raise serializers.ValidationError('An AI model with this slug already exists.')
        return slug


class AIModelUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ('name', 'slug', 'model_type', 'description', 'is_active')
        read_only_fields = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['name'].required = False
        self.fields['slug'].required = False
        self.fields['model_type'].required = False

    def validate_slug(self, value: str) -> str:
        slug = value.strip().lower()
        queryset = AIModel.objects.filter(slug__iexact=slug)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('An AI model with this slug already exists.')
        return slug


class AIModelVersionManageSerializer(serializers.ModelSerializer):
    model_id = serializers.IntegerField(source='ai_model.id', read_only=True)
    model_name = serializers.CharField(source='ai_model.name', read_only=True)
    model_slug = serializers.CharField(source='ai_model.slug', read_only=True)

    class Meta:
        model = AIModelVersion
        fields = (
            'id',
            'model_id',
            'model_name',
            'model_slug',
            'version',
            'weights_path',
            'status',
            'accuracy',
            'trained_at',
            'is_active',
            'training_notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class AIModelVersionCreateSerializer(serializers.ModelSerializer):
    model_id = serializers.IntegerField(min_value=1, write_only=True)

    class Meta:
        model = AIModelVersion
        fields = (
            'model_id',
            'version',
            'weights_path',
            'status',
            'accuracy',
            'trained_at',
            'is_active',
            'training_notes',
        )

    def validate_model_id(self, value: int) -> int:
        if not AIModel.objects.filter(id=value).exists():
            raise serializers.ValidationError('Selected AI model does not exist.')
        return value

    def validate(self, attrs):
        model_id = attrs.get('model_id')
        version = attrs.get('version', '').strip()
        if model_id and version and AIModelVersion.objects.filter(ai_model_id=model_id, version=version).exists():
            raise serializers.ValidationError({'version': 'This model already has a version with this label.'})
        return attrs

    def create(self, validated_data):
        model_id = validated_data.pop('model_id')
        return AIModelVersion.objects.create(ai_model_id=model_id, **validated_data)


class AIModelVersionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModelVersion
        fields = ('version', 'weights_path', 'status', 'accuracy', 'trained_at', 'is_active', 'training_notes')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in self.fields:
            self.fields[field_name].required = False

    def validate_version(self, value: str) -> str:
        version = value.strip()
        instance = self.instance
        if instance and AIModelVersion.objects.filter(
            ai_model_id=instance.ai_model_id,
            version=version,
        ).exclude(id=instance.id).exists():
            raise serializers.ValidationError('This model already has a version with this label.')
        return version


class AITrainingHistoryManageSerializer(serializers.ModelSerializer):
    model_version_id = serializers.IntegerField(source='model_version.id', read_only=True)
    model_id = serializers.IntegerField(source='model_version.ai_model.id', read_only=True)
    model_name = serializers.CharField(source='model_version.ai_model.name', read_only=True)
    model_slug = serializers.CharField(source='model_version.ai_model.slug', read_only=True)
    version_label = serializers.CharField(source='model_version.version', read_only=True)
    triggered_by_email = serializers.EmailField(source='triggered_by.email', read_only=True, allow_null=True)

    class Meta:
        model = AITrainingHistory
        fields = (
            'id',
            'model_version_id',
            'model_id',
            'model_name',
            'model_slug',
            'version_label',
            'status',
            'dataset_name',
            'epochs',
            'batch_size',
            'learning_rate',
            'final_accuracy',
            'final_loss',
            'started_at',
            'completed_at',
            'log_summary',
            'triggered_by_email',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class AITrainingHistoryCreateSerializer(serializers.ModelSerializer):
    model_version_id = serializers.IntegerField(min_value=1, write_only=True)

    class Meta:
        model = AITrainingHistory
        fields = (
            'model_version_id',
            'status',
            'dataset_name',
            'epochs',
            'batch_size',
            'learning_rate',
            'final_accuracy',
            'final_loss',
            'started_at',
            'completed_at',
            'log_summary',
        )

    def validate_model_version_id(self, value: int) -> int:
        if not AIModelVersion.objects.filter(id=value).exists():
            raise serializers.ValidationError('Selected model version does not exist.')
        return value

    def create(self, validated_data):
        model_version_id = validated_data.pop('model_version_id')
        request = self.context.get('request')
        triggered_by = getattr(request, 'user', None) if request and request.user.is_authenticated else None
        return AITrainingHistory.objects.create(
            model_version_id=model_version_id,
            triggered_by=triggered_by,
            **validated_data,
        )


class AITrainingHistoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITrainingHistory
        fields = (
            'status',
            'dataset_name',
            'epochs',
            'batch_size',
            'learning_rate',
            'final_accuracy',
            'final_loss',
            'started_at',
            'completed_at',
            'log_summary',
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in self.fields:
            self.fields[field_name].required = False
