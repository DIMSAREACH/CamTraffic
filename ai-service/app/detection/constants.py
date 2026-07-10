"""Traffic sign class labels mapped to CamTraffic sign codes."""

SIGN_CODE_BY_CLASS: dict[str, str] = {
    'speed_limit_20': 'R-020',
    'speed_limit_30': 'R-030',
    'speed_limit_40': 'R-001',
    'speed_limit_50': 'R-050',
    'speed_limit_60': 'R-002',
    'no_entry': 'P-002',
    'stop': 'P-001',
    'yield': 'R-003',
    'no_u_turn': 'P-003',
    'one_way': 'R-004',
    'parking_prohibited': 'P-004',
    'pedestrian_crossing': 'W-002',
    'school_zone': 'W-003',
    'traffic_light_signal': 'R-005',
    'unknown_sign': 'U-001',
    'sharp_curve': 'W-001',
    # Alternate labels that YOLO exports may use.
    'Stop': 'P-001',
    'No Entry': 'P-002',
    'Speed Limit 40': 'R-001',
    'Speed Limit 60': 'R-002',
    'Sharp Curve': 'W-001',
    'P-001': 'P-001',
    'P-002': 'P-002',
    'R-001': 'R-001',
    'R-002': 'R-002',
    'W-001': 'W-001',
}

VEHICLE_CLASS_NAMES = frozenset(
    {
        'car_sedan',
        'car_suv',
        'car_pickup',
        'car_hatchback',
        'motorcycle_small',
        'motorcycle_large',
        'scooter',
        'taxi',
        'bus',
        'truck',
        'van',
        'government_vehicle',
        'police_vehicle',
    }
)

PLATE_CLASS_NAMES = frozenset(
    {
        'license_plate_kh_private',
        'license_plate_kh_commercial',
        'license_plate_kh_government',
    }
)


def resolve_sign_code(class_name: str) -> str | None:
    normalized = class_name.strip()
    if not normalized:
        return None
    if normalized in SIGN_CODE_BY_CLASS:
        return SIGN_CODE_BY_CLASS[normalized]
    upper = normalized.upper()
    if upper in SIGN_CODE_BY_CLASS:
        return SIGN_CODE_BY_CLASS[upper]
    return None
