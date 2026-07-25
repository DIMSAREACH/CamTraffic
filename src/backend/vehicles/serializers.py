from rest_framework import serializers

from core.media_urls import api_media_url

from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source='owner.id', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    registration_photo = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = (
            'id', 'owner_id', 'owner_name', 'plate_number', 'vehicle_type',
            'model', 'color', 'year', 'registration_photo', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'owner_id', 'owner_name')

    def get_registration_photo(self, obj):
        if not obj.registration_photo:
            return None
        url = api_media_url(self.context.get('request'), obj.registration_photo)
        return url or None


class VehicleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ('plate_number', 'vehicle_type', 'model', 'color', 'year', 'registration_photo')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['owner'] = user
        driver = getattr(user, 'driver_profile', None)
        if driver is not None:
            validated_data['driver'] = driver
        return super().create(validated_data)


class VehicleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ('plate_number', 'vehicle_type', 'model', 'color', 'year', 'registration_photo')
