from rest_framework import serializers

from .models import TrafficSign


class TrafficSignSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = TrafficSign
        fields = (
            'id', 'sign_name', 'sign_code', 'description', 'guidance',
            'image', 'category', 'penalty', 'rules',
        )

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return ''
