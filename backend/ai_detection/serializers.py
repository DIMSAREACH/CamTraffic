from rest_framework import serializers

from .models import AIDetectionLog


class AIDetectionLogSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    uploaded_image = serializers.SerializerMethodField()

    class Meta:
        model = AIDetectionLog
        fields = (
            'id', 'user_id', 'user_name', 'uploaded_image', 'detected_sign',
            'confidence', 'description', 'guidance', 'created_at',
        )

    def get_uploaded_image(self, obj):
        if obj.uploaded_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.uploaded_image.url)
            return obj.uploaded_image.url
        return ''
