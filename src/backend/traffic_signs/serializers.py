import json

from rest_framework import serializers

from core.media_urls import api_media_url

from .models import TrafficSign


class TrafficSignSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficSign
        fields = (
            'id', 'sign_name', 'sign_name_km', 'sign_name_en', 'sign_code',
            'description', 'description_en', 'guidance', 'guidance_en',
            'image', 'category', 'penalty', 'rules',
        )
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
        }

    def validate_rules(self, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError('Rules must be a JSON array.') from exc
            if not isinstance(parsed, list):
                raise serializers.ValidationError('Rules must be a JSON array.')
            return parsed
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.image:
            data['image'] = api_media_url(self.context.get('request'), instance.image)
        else:
            data['image'] = ''
        return data
