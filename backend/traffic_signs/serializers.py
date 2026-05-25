import json

from rest_framework import serializers

from .models import TrafficSign


class TrafficSignSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficSign
        fields = (
            'id', 'sign_name', 'sign_code', 'description', 'guidance',
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
            request = self.context.get('request')
            if request:
                data['image'] = request.build_absolute_uri(instance.image.url)
            else:
                data['image'] = instance.image.url
        else:
            data['image'] = ''
        return data
