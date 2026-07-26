from rest_framework import serializers

from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source='owner.id', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id', 'owner_id', 'owner_name', 'plate_number', 'vehicle_type',
            'model', 'color', 'year', 'registration_photo', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'owner_id', 'owner_name')


class VehicleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ('plate_number', 'vehicle_type', 'model', 'color', 'year')

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
        fields = ('plate_number', 'vehicle_type', 'model', 'color', 'year')
