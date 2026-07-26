"""
Camera model specifications and capabilities.
Define hardware specs for different camera models used in the system.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class CameraModelSpec:
    """Hardware specification for a camera model."""
    
    model_code: str
    manufacturer: str
    model_name: str
    description: str
    
    # Detection capabilities
    has_radar: bool = False
    radar_frequency_ghz: Optional[float] = None
    radar_range_m: tuple[int, int] = (0, 0)  # (min, max)
    capture_rate_percent: float = 95.0
    max_targets: int = 100
    
    # Speed measurement
    speed_range_kmh: tuple[int, int] = (-300, 300)
    speed_accuracy_kmh: float = 2.0
    
    # Coverage
    lane_coverage: int = 4
    detection_distance_m: int = 350
    
    # Vehicle classification
    vehicle_types_supported: tuple[str, ...] = ('car', 'truck', 'motorcycle', 'bus')
    
    # Environmental
    ip_rating: str = 'IP67'
    low_light_capable: bool = True
    weather_resistant: bool = True
    
    # Video specs
    resolution: str = '1080p'
    frame_rate: int = 25
    
    # Features
    supports_virtual_coils: bool = False
    supports_anpr: bool = False  # Automatic Number Plate Recognition
    supports_traffic_flow: bool = True
    supports_incident_detection: bool = True


# Camera model catalog
CAMERA_MODELS = {
    'HIKVISION_IDS_TCD402': CameraModelSpec(
        model_code='iDS-TCD402-CR/12/64G',
        manufacturer='Hikvision',
        model_name='Traffic Flow Detection Camera',
        description='Radar-assisted traffic flow detection camera with 77 GHz narrow beam radar',
        
        # Radar capabilities
        has_radar=True,
        radar_frequency_ghz=77.0,
        radar_range_m=(15, 350),
        capture_rate_percent=95.0,
        max_targets=256,
        
        # Speed measurement
        speed_range_kmh=(-300, 300),
        speed_accuracy_kmh=2.0,
        
        # Coverage
        lane_coverage=4,
        detection_distance_m=350,
        
        # Vehicle types
        vehicle_types_supported=('car', 'truck', 'motorcycle', 'bus', 'large', 'small'),
        
        # Environmental
        ip_rating='IP67',
        low_light_capable=True,
        weather_resistant=True,
        
        # Video
        resolution='1080p',
        frame_rate=25,
        
        # Features
        supports_virtual_coils=True,
        supports_anpr=True,
        supports_traffic_flow=True,
        supports_incident_detection=True,
    ),
    
    'HIKVISION_STANDARD': CameraModelSpec(
        model_code='DS-2CD2xxx',
        manufacturer='Hikvision',
        model_name='Standard IP Camera',
        description='Standard Hikvision IP camera for general surveillance',
        
        has_radar=False,
        capture_rate_percent=90.0,
        max_targets=50,
        
        lane_coverage=2,
        detection_distance_m=100,
        
        ip_rating='IP66',
        resolution='1080p',
        frame_rate=30,
        
        supports_virtual_coils=False,
        supports_anpr=False,
        supports_traffic_flow=False,
        supports_incident_detection=False,
    ),
    
    'GENERIC_CCTV': CameraModelSpec(
        model_code='GENERIC',
        manufacturer='Generic',
        model_name='Generic CCTV Camera',
        description='Generic CCTV camera for basic monitoring',
        
        has_radar=False,
        capture_rate_percent=85.0,
        max_targets=30,
        
        lane_coverage=1,
        detection_distance_m=50,
        
        ip_rating='IP65',
        resolution='720p',
        frame_rate=25,
        
        supports_virtual_coils=False,
        supports_anpr=False,
        supports_traffic_flow=False,
        supports_incident_detection=False,
    ),
}


def get_camera_model_spec(model_code: str) -> Optional[CameraModelSpec]:
    """Get camera model specification by model code."""
    for key, spec in CAMERA_MODELS.items():
        if spec.model_code == model_code or key == model_code:
            return spec
    return None


def get_all_camera_models() -> list[CameraModelSpec]:
    """Get all available camera model specifications."""
    return list(CAMERA_MODELS.values())


def get_hikvision_traffic_camera() -> CameraModelSpec:
    """Get the Hikvision iDS-TCD402 traffic camera spec (shortcut)."""
    return CAMERA_MODELS['HIKVISION_IDS_TCD402']
