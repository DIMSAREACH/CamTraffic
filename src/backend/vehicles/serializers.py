from django.conf import settings
from rest_framework import serializers

from core.cambodia_identity import is_valid_plate, normalize_plate
from core.media_urls import api_media_url, hydrate_local_media_from_storage
from users.models import Driver

from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source='owner.id', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id', 'owner_id', 'owner_name', 'plate_number', 'vehicle_type',
            'make', 'model', 'color', 'year', 'registration_photo', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'owner_id', 'owner_name')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('plate_number'):
            data['plate_number'] = normalize_plate(data['plate_number'])
        # Prefer Vite-friendly /media/...; hydrate from R2 when local copy is missing.
        # Vehicle lists are small, so on-demand hydrate is safe (unlike AI log pages).
        photo = instance.registration_photo
        if photo:
            request = self.context.get('request')
            url = api_media_url(request, photo)
            if not url and getattr(settings, 'USE_S3_MEDIA', False):
                hydrate_local_media_from_storage(photo, force=True)
                url = api_media_url(request, photo)
            data['registration_photo'] = url or None
        else:
            data['registration_photo'] = None
        return data


class VehicleCreateSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Vehicle
        fields = (
            'owner_id', 'plate_number', 'vehicle_type', 'model', 'color', 'year',
            'registration_photo',
        )

    def validate_plate_number(self, value):
        plate = normalize_plate(value)
        if not plate or not is_valid_plate(plate):
            raise serializers.ValidationError(
                f'Plate must match Cambodia format (e.g. 2CO-5410), got {plate!r}.',
            )
        return plate

    def create(self, validated_data):
        request_user = self.context['request'].user
        owner_id = validated_data.pop('owner_id', None)

        if request_user.role in ('admin', 'police'):
            if not owner_id:
                raise serializers.ValidationError({
                    'owner_id': 'Select the driver who owns this vehicle.',
                })
            try:
                driver = Driver.objects.select_related('user').get(
                    user_id=owner_id,
                    user__role='driver',
                    user__is_active=True,
                    user__deleted_at__isnull=True,
                )
            except Driver.DoesNotExist as exc:
                raise serializers.ValidationError({
                    'owner_id': 'Active driver account not found.',
                }) from exc
            validated_data['owner'] = driver.user
            validated_data['driver'] = driver
        else:
            validated_data['owner'] = request_user
            driver = getattr(request_user, 'driver_profile', None)
            if driver is not None:
                validated_data['driver'] = driver
        return super().create(validated_data)


class VehicleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = (
            'plate_number', 'vehicle_type', 'model', 'color', 'year',
            'registration_photo',
        )

    def validate_plate_number(self, value):
        plate = normalize_plate(value)
        if not plate or not is_valid_plate(plate):
            raise serializers.ValidationError(
                f'Plate must match Cambodia format (e.g. 2CO-5410), got {plate!r}.',
            )
        return plate
