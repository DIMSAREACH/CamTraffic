"""
Serializers for infrastructure models (Camera, Road, etc.)
Includes camera model specifications integration.
"""
from rest_framework import serializers

from .models import Camera, Road, PoliceStation
from .camera_models import get_camera_model_spec


class RoadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Road
        fields = '__all__'


class PoliceStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceStation
        fields = '__all__'


class CameraSerializer(serializers.ModelSerializer):
    road_name = serializers.CharField(source='road.name', read_only=True)
    model_specs = serializers.SerializerMethodField()
    
    class Meta:
        model = Camera
        fields = '__all__'
    
    def get_model_specs(self, obj):
        """Get camera model specifications if available."""
        if not obj.model:
            return None
        
        spec = get_camera_model_spec(obj.model)
        if not spec:
            return None
        
        return {
            'model_code': spec.model_code,
            'manufacturer': spec.manufacturer,
            'model_name': spec.model_name,
            'description': spec.description,
            'has_radar': spec.has_radar,
            'radar_frequency_ghz': spec.radar_frequency_ghz,
            'radar_range_m': spec.radar_range_m,
            'capture_rate_percent': spec.capture_rate_percent,
            'max_targets': spec.max_targets,
            'speed_range_kmh': spec.speed_range_kmh,
            'speed_accuracy_kmh': spec.speed_accuracy_kmh,
            'lane_coverage': spec.lane_coverage,
            'detection_distance_m': spec.detection_distance_m,
            'vehicle_types_supported': spec.vehicle_types_supported,
            'ip_rating': spec.ip_rating,
            'low_light_capable': spec.low_light_capable,
            'weather_resistant': spec.weather_resistant,
            'supports_virtual_coils': spec.supports_virtual_coils,
            'supports_anpr': spec.supports_anpr,
            'supports_traffic_flow': spec.supports_traffic_flow,
            'supports_incident_detection': spec.supports_incident_detection,
        }


class CameraListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for camera lists."""
    road_name = serializers.CharField(source='road.name', read_only=True)
    is_hikvision_traffic = serializers.SerializerMethodField()
    
    class Meta:
        model = Camera
        fields = [
            'id',
            'name',
            'code',
            'model',
            'brand',
            'camera_type',
            'status',
            'road',
            'road_name',
            'latitude',
            'longitude',
            'ai_enabled',
            'is_hikvision_traffic',
        ]
    
    def get_is_hikvision_traffic(self, obj):
        """Check if this is the Hikvision traffic detection model."""
        return obj.model == 'iDS-TCD402-CR/12/64G'
