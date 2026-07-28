from rest_framework import serializers

from .models import AIModelVersion


class AIModelVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = AIModelVersion
        fields = (
            'id', 'version', 'model_file', 'description', 'accuracy',
            'is_active', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        )
        read_only_fields = ('id', 'uploaded_at', 'uploaded_by', 'uploaded_by_name')
