from rest_framework import serializers

from .models import Camera, PoliceStation, Road


class PoliceStationSerializer(serializers.ModelSerializer):
    officer_count = serializers.IntegerField(source='officers.count', read_only=True)

    class Meta:
        model = PoliceStation
        fields = (
            'id', 'name', 'code', 'city', 'region', 'address', 'phone',
            'latitude', 'longitude', 'status', 'officer_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'officer_count')

    def validate_code(self, value):
        code = (value or '').strip().upper()
        if not code:
            raise serializers.ValidationError('Station code is required.')
        qs = PoliceStation.objects.filter(code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Station code already exists.')
        return code

    def validate(self, attrs):
        for key in ('city', 'region', 'address', 'phone'):
            if key in attrs and attrs[key] is None:
                attrs[key] = ''
        return attrs


class RoadSerializer(serializers.ModelSerializer):
    camera_count = serializers.IntegerField(source='cameras.count', read_only=True)

    class Meta:
        model = Road
        fields = (
            'id', 'name', 'road_type', 'length_km', 'speed_limit', 'region', 'city',
            'latitude', 'longitude', 'status', 'camera_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'camera_count')


class CameraSerializer(serializers.ModelSerializer):
    road_id = serializers.UUIDField(source='road.id', read_only=True)
    road_name = serializers.CharField(source='road.name', read_only=True)
    # Write-only stream credential; never returned in GET responses.
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default='',
    )
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = (
            'id', 'road_id', 'road_name', 'road', 'name', 'code', 'model', 'camera_type',
            'installed_date', 'latitude', 'longitude', 'status', 'frame_source_url',
            'rtsp_url', 'resolution', 'brand', 'serial_number', 'username', 'password',
            'has_password', 'ip_address', 'port', 'fps', 'bitrate', 'codec',
            'onvif_enabled', 'recording_enabled', 'ai_enabled', 'detection_type',
            'confidence_threshold', 'is_disabled', 'description',
            'province', 'district', 'street',
            'last_sync_at', 'last_ping', 'detection_count_today',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'road_id', 'road_name',
            'has_password', 'last_sync_at', 'last_ping', 'detection_count_today',
        )

    def get_has_password(self, obj):
        return bool((obj.password_encrypted or '').strip())

    def validate_road(self, value):
        if value.status == 'inactive':
            raise serializers.ValidationError('Cannot assign a camera to an inactive road.')
        return value

    def validate_code(self, value):
        code = (value or '').strip()
        if not code:
            return code
        qs = Camera.objects.filter(code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Camera code already exists.')
        return code

    def create(self, validated_data):
        password = validated_data.pop('password', '') or ''
        if password:
            validated_data['password_encrypted'] = password
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password is not None and password != '':
            validated_data['password_encrypted'] = password
        return super().update(instance, validated_data)
