from rest_framework import serializers

from apps.officers.models import PoliceStation

from .models import Camera


class CameraManageSerializer(serializers.ModelSerializer):
    station_id = serializers.IntegerField(source='station.id', read_only=True, allow_null=True)
    station_code = serializers.CharField(source='station.code', read_only=True, allow_null=True)
    station_name = serializers.CharField(source='station.name', read_only=True, allow_null=True)

    class Meta:
        model = Camera
        fields = (
            'id',
            'name',
            'code',
            'location',
            'stream_url',
            'status',
            'station_id',
            'station_code',
            'station_name',
            'latitude',
            'longitude',
            'is_active',
            'last_health_check',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'last_health_check', 'created_at', 'updated_at')

    def validate_code(self, value: str) -> str:
        code = value.strip().upper()
        queryset = Camera.objects.filter(code__iexact=code)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A camera with this code already exists.')
        return code


class CameraCreateSerializer(CameraManageSerializer):
    station_id = serializers.PrimaryKeyRelatedField(
        source='station',
        queryset=PoliceStation.objects.filter(is_active=True),
        allow_null=True,
        required=False,
    )

    class Meta(CameraManageSerializer.Meta):
        fields = CameraManageSerializer.Meta.fields
        read_only_fields = ('id', 'station_code', 'station_name', 'last_health_check', 'created_at', 'updated_at')


class CameraUpdateSerializer(CameraManageSerializer):
    station_id = serializers.PrimaryKeyRelatedField(
        source='station',
        queryset=PoliceStation.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta(CameraManageSerializer.Meta):
        read_only_fields = ('id', 'station_code', 'station_name', 'last_health_check', 'created_at', 'updated_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('name', 'code', 'location'):
            self.fields[field_name].required = False


class CameraLiveFeedSerializer(serializers.ModelSerializer):
    station_id = serializers.IntegerField(source='station.id', read_only=True, allow_null=True)
    station_code = serializers.CharField(source='station.code', read_only=True, allow_null=True)
    station_name = serializers.CharField(source='station.name', read_only=True, allow_null=True)
    is_stream_available = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = (
            'id',
            'name',
            'code',
            'location',
            'stream_url',
            'status',
            'station_id',
            'station_code',
            'station_name',
            'is_active',
            'is_stream_available',
            'last_health_check',
        )
        read_only_fields = fields

    def get_is_stream_available(self, obj: Camera) -> bool:
        return bool(obj.is_active and obj.status == Camera.Status.ONLINE and obj.stream_url)


class CameraLiveDashboardSerializer(serializers.Serializer):
    total_cameras = serializers.IntegerField()
    online_cameras = serializers.IntegerField()
    offline_cameras = serializers.IntegerField()
    streaming_cameras = serializers.IntegerField()
    cameras = CameraLiveFeedSerializer(many=True)


class CameraHealthRecordSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    location = serializers.CharField()
    status = serializers.CharField()
    station_id = serializers.IntegerField(allow_null=True)
    station_code = serializers.CharField(allow_null=True)
    station_name = serializers.CharField(allow_null=True)
    is_active = serializers.BooleanField()
    last_health_check = serializers.DateTimeField(allow_null=True)
    health_state = serializers.CharField()
    minutes_since_check = serializers.FloatField(allow_null=True)
    has_stream_url = serializers.BooleanField()


class CameraHealthMonitoringSerializer(serializers.Serializer):
    total_cameras = serializers.IntegerField()
    healthy_cameras = serializers.IntegerField()
    warning_cameras = serializers.IntegerField()
    critical_cameras = serializers.IntegerField()
    unknown_cameras = serializers.IntegerField()
    stale_check_cameras = serializers.IntegerField()
    cameras = CameraHealthRecordSerializer(many=True)
