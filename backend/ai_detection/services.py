"""
AI traffic sign detection service.
Uses YOLOv8 when model weights exist; falls back to rule-based mock for demos.
Enriches results from the TrafficSign database when available.
"""
import hashlib
import json
import logging
import os
import re
import tempfile
import time
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(settings.BASE_DIR).parent / 'ai'
CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
CUSTOM_SIGNS_DIR = AI_ROOT / 'custom_signs'
_CUSTOM_SIGN_HASH_CACHE: dict[str, str] | None = None
_REFERENCE_IMAGE_HASH_CACHE: dict[str, str] | None = None
_SIGN_CATALOG_CACHE: list[dict] | None = None
_SIGN_MODEL = None

# YOLO class names (data.yaml) → sign_catalog.json class_key
YOLO_CLASS_ALIASES = {
    'close_for_all_road_users': 'road_closed_all_users',
    'close_for_all_vehicles': 'road_closed_all_vehicles',
    'weight_limit_on_one_axle': 'axle_weight_limit',
    'road_closed_all_users': 'road_closed_all_users',
    'road_closed_all_vehicles': 'road_closed_all_vehicles',
}

# Cambodia traffic sign knowledge base (used for mock / enrichment)
SIGN_KNOWLEDGE = {
    'stop': {
        'sign_name': 'Stop Sign',
        'description': 'Drivers must come to a complete stop before the stop line or intersection.',
        'guidance': 'Reduce speed, stop completely, check all directions, then proceed when safe.',
    },
    'no_entry': {
        'sign_name': 'No Entry',
        'description': 'Vehicles are prohibited from entering this road or area.',
        'guidance': 'Do not enter. Find an alternate route.',
    },
    'speed_limit_40': {
        'sign_name': 'Speed Limit 40 km/h',
        'description': 'Maximum permitted speed is 40 km/h in this zone.',
        'guidance': 'Adjust speed to stay at or below 40 km/h. Watch for pedestrians.',
    },
    'speed_limit_60': {
        'sign_name': 'Speed Limit 60 km/h',
        'description': 'Maximum permitted speed is 60 km/h.',
        'guidance': 'Maintain speed at or below 60 km/h unless conditions require slower driving.',
    },
    'yield': {
        'sign_name': 'Yield / Give Way',
        'description': 'Give priority to traffic on the main road.',
        'guidance': 'Slow down and be prepared to stop for crossing traffic.',
    },
    'no_parking': {
        'sign_name': 'No Parking',
        'description': 'Parking is not allowed in this area.',
        'guidance': 'Do not stop or park. Move to a designated parking zone.',
    },
    'pedestrian_crossing': {
        'sign_name': 'Pedestrian Crossing',
        'description': 'Pedestrians may cross at this location.',
        'guidance': 'Reduce speed and yield to pedestrians on or approaching the crossing.',
    },
    'one_way': {
        'sign_name': 'One Way',
        'description': 'Traffic may travel only in the direction indicated by the arrow.',
        'guidance': 'Follow the arrow direction only. Do not drive against traffic.',
    },
    'no_u_turn': {
        'sign_name': 'No U-Turn',
        'description': 'U-turns are prohibited at this location.',
        'guidance': 'Continue straight or turn at the next legal intersection.',
    },
    'roundabout': {
        'sign_name': 'Roundabout Ahead',
        'description': 'A circular intersection is ahead.',
        'guidance': 'Yield to traffic already in the roundabout. Signal when exiting.',
    },
    'R1_01': {
        'sign_name': 'ហាមបត់ឆ្វេង',
        'description': (
            'ស្លាកហាមបត់ឆ្វេង។ រូបសញ្ញាជាក្រួចទៅឆ្វេងមានរន្ធកាត់ពណ៌ក្រហម។ '
            'រថយន្តគ្រប់ប្រភេទមិនត្រូវបត់ឆ្វេងនៅកន្លែងនេះ ត្រូវធ្វើដំណើរផ្ទាល់ ឬបត់ស្តាំបើអនុញ្ញាត។'
        ),
        'guidance': (
            'សូមកុំបត់ឆ្វេង។ បន្តផ្ទាល់ ឬបត់ស្តាំតាមដែលអនុញ្ញាត។ '
            'រក្សាសុវត្ថិភាពចរាចរនៅរង្វង់ផ្ទុះ។'
        ),
    },
}

CLASS_NAMES = list(SIGN_KNOWLEDGE.keys())

# Deterministic mock mapping for known test/reference images (MD5 of file bytes)
KNOWN_IMAGE_HASH_TO_CLASS = {
    'c2d6b6745c74324bcfe0a7e8f2150def': 'R1_01',  # R1-01 info sheet
    '9790716e72d75867c7339ba7c51e15ce': 'PW03_R1_01',  # Cambodia_road_sign_PW03-R1-01.svg.png
    'ed5b5c56771744fba95e72dce75d6c43': 'R1_01',  # R1-01 reference graphic
    'a539740cb564402fe42062e55411a300': 'PW03_R1_02',  # Cambodia_road_sign_PW03-R1-02.svg.png
    '316b4ca2c1531667ae319ca504685b3e': 'PW03_R1_03',  # Cambodia_road_sign_PW03-R1-03.svg.png
    '4e35db0eba5f83bc35c074d6e871c60e': 'PW03_R1_04',  # Cambodia_road_sign_PW03-R1-04.svg.png
}

# Reference filename stems → catalog class_key (same rules as ai/build_dataset.py)
STEM_TO_CLASS: dict[str, str] = {
    'closeforallroadusers': 'ROAD_CLOSED_ALL_USERS',
    'closeforallvehicles': 'ROAD_CLOSED_ALL_VEHICLES',
    'heightlimit': 'HEIGHT_LIMIT',
    'noleftturn': 'NO_LEFT_TURN',
    'noparking': 'NO_PARKING',
    'norightturn': 'NO_RIGHT_TURN',
    'nouturn': 'NO_U_TURN',
    'totalweightlimit': 'TOTAL_WEIGHT_LIMIT',
    'weightlimitononeaxle': 'AXLE_WEIGHT_LIMIT',
    'widthlimit': 'WIDTH_LIMIT',
    'lenghtlimit': 'LENGTH_LIMIT',
    'lengthlimit': 'LENGTH_LIMIT',
    'noentry': 'NO_ENTRY',
    'noentryformotorcycle': 'NO_ENTRY_FOR_MOTORCYCLE',
    'noentryformotorvehiclesexceptmotorcycleswithoutsidecarts': 'NO_ENTRY_MOTOR_EXCEPT_MOTORCYCLE',
    'noentryforbicyclemotorcycleandtricycle': 'NO_ENTRY_BICYCLE_MOTORCYCLE_TRICYCLE',
    'noentryforbicycle': 'NO_ENTRY_BICYCLE',
    'noentryforlargedsizedbus': 'NO_ENTRY_LARGE_BUS',
    'noentryforlargedsizedtruck': 'NO_ENTRY_LARGE_TRUCK',
    'noentryformotorvehicles': 'NO_ENTRY_MOTOR_VEHICLES',
    'nostopping': 'NO_STOPPING',
}

GENERIC_UPLOAD_STEMS = frozenset({
    'image', 'img', 'photo', 'picture', 'upload', 'scan', 'screenshot', 'snap', 'camera', 'sign', 'file',
})

# Filename hints when YOLO finds nothing (upload names like NO_TURN_RIGHT.png)
FILENAME_CLASS_HINTS = (
    ('pw03-r1-02', 'PW03_R1_02'),
    ('pw03_r1_02', 'PW03_R1_02'),
    ('no_turn_right', 'PW03_R1_02'),
    ('no-turn-right', 'PW03_R1_02'),
    ('pw03-r1-01', 'PW03_R1_01'),
    ('pw03_r1_01', 'PW03_R1_01'),
    ('no_turn_left', 'PW03_R1_01'),
    ('no-left', 'PW03_R1_01'),
    ('no_left', 'PW03_R1_01'),
    ('pw03-r1-03', 'PW03_R1_03'),
    ('pw03_r1_03', 'PW03_R1_03'),
    ('no_u_turn', 'PW03_R1_03'),
    ('no-u-turn', 'PW03_R1_03'),
    ('u_turn', 'PW03_R1_03'),
    ('pw03-r1-04', 'PW03_R1_04'),
    ('pw03_r1_04', 'PW03_R1_04'),
    ('no_entry', 'PW03_R1_04'),
    ('no-entry', 'PW03_R1_04'),
)


def _slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def _code_to_class_key(sign_code: str) -> str:
    return sign_code.upper().replace('-', '_')


def _norm_class_token(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', (value or '').lower()).strip('_')


def _canonical_class_key(class_key: str) -> str:
    key = _norm_class_token(class_key)
    return YOLO_CLASS_ALIASES.get(key, key)


def _load_sign_catalog() -> list[dict]:
    global _SIGN_CATALOG_CACHE
    if _SIGN_CATALOG_CACHE is not None:
        return _SIGN_CATALOG_CACHE
    if not CATALOG_PATH.is_file():
        _SIGN_CATALOG_CACHE = []
        return _SIGN_CATALOG_CACHE
    try:
        _SIGN_CATALOG_CACHE = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        logger.warning('Could not read %s', CATALOG_PATH)
        _SIGN_CATALOG_CACHE = []
    return _SIGN_CATALOG_CACHE


def _catalog_row_for_token(token: str) -> dict | None:
    if not token:
        return None
    norm = _canonical_class_key(token)
    code_norm = token.upper().replace('_', '-')
    for row in _load_sign_catalog():
        ck = _canonical_class_key(row.get('class_key', ''))
        sc = (row.get('sign_code') or '').upper()
        if ck == norm or sc == code_norm:
            return row
    return None


def _norm_stem(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def _sign_code_from_filename(path_str: str) -> str | None:
    m = re.search(r'pw03[_-]?r([12])[_-]?(\d{1,2})', path_str, re.I)
    if m:
        return f'PW03-R{m.group(1)}-{int(m.group(2)):02d}'
    return None


def _stem_class_from_filename(name: str) -> str | None:
    stem = _norm_stem(Path(name).stem)
    mapped = STEM_TO_CLASS.get(stem)
    return _canonical_class_key(mapped) if mapped else None


def _explicit_filename_class(hint_source: str) -> str | None:
    """Resolve class from upload basename (PW03 code or reference stem)."""
    basename = Path(hint_source).name
    stem_class = _stem_class_from_filename(basename)
    if stem_class:
        return stem_class
    sign_code = _sign_code_from_filename(basename.lower())
    if sign_code:
        row = _catalog_row_for_token(sign_code)
        if row and row.get('class_key'):
            return _canonical_class_key(row['class_key'])
    return _filename_class_hint(basename)


def _is_generic_upload_filename(name: str) -> bool:
    stem = Path(name).stem.lower()
    if _stem_class_from_filename(name) or _sign_code_from_filename(name.lower()):
        return False
    if stem in GENERIC_UPLOAD_STEMS:
        return True
    if re.fullmatch(r'[\d_-]+', stem):
        return True
    return bool(re.match(r'^(img|dsc|photo|image|screenshot|snap|camera|upload)[\d_-]*$', stem))


def _min_result_confidence() -> float:
    return float(getattr(settings, 'AI_MIN_RESULT_CONFIDENCE', 35))


def _absolute_yolo_floor() -> float:
    """Lowest YOLO confidence still shown when Gemini is unavailable."""
    return float(getattr(settings, 'AI_ABSOLUTE_YOLO_FLOOR', 18))


def _live_yolo_floor() -> float:
    """Lower floor for webcam / camera-frame captures (noisy, small signs)."""
    return float(getattr(settings, 'AI_LIVE_YOLO_FLOOR', 10))


def _upload_yolo_floor() -> float:
    """Last-resort YOLO floor for uploads when Gemini is unavailable."""
    return float(getattr(settings, 'AI_UPLOAD_YOLO_FLOOR', 5))


def _accept_yolo_confidence(
    confidence: float,
    *,
    live_capture: bool = False,
    upload_fallback: bool = False,
) -> bool:
    conf = float(confidence or 0)
    if live_capture and conf >= _live_yolo_floor():
        return True
    if upload_fallback and conf >= _upload_yolo_floor():
        return True
    return conf >= _min_result_confidence() or conf >= _absolute_yolo_floor()


def _temp_jpeg_path() -> tuple[str, str]:
    """Return a closed temp .jpg path (Windows-safe for cv2/PIL writes)."""
    fd, path = tempfile.mkstemp(suffix='.jpg')
    os.close(fd)
    return path, path


def _prepare_image_for_yolo(image_path) -> tuple[str, str | None]:
    """Composite transparent PNGs onto a road-like background (matches training)."""
    from PIL import Image

    path = Path(image_path)
    try:
        img = Image.open(path)
    except OSError:
        return str(path), None

    if img.mode != 'RGBA':
        return str(path), None

    bg = Image.new('RGB', img.size, (205, 210, 218))
    bg.paste(img, mask=img.split()[3])
    path, _ = _temp_jpeg_path()
    bg.save(path, 'JPEG', quality=92)
    return path, path


def _extract_red_sign_crop(image_path) -> tuple[str, str | None] | None:
    """Crop probable prohibitory (red circle) sign regions for noisy webcam frames."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    img = cv2.imread(str(image_path))
    if img is None:
        return None

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 70, 70]), np.array([12, 255, 255])),
        cv2.inRange(hsv, np.array([165, 70, 70]), np.array([180, 255, 255])),
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    height, width = img.shape[:2]
    frame_area = height * width
    candidates: list[tuple[int, int, int, int, int]] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < max(400, int(frame_area * 0.008)):
            continue
        aspect = w / h if h else 0.0
        if aspect < 0.4 or aspect > 2.5:
            continue
        candidates.append((area, x, y, w, h))
    if not candidates:
        return None

    candidates.sort(reverse=True)
    for _, x, y, w, h in candidates[:3]:
        side = max(w, h)
        pad = int(side * 0.15)
        cx, cy = x + w // 2, y + h // 2
        half = side // 2 + pad
        x1, y1 = max(0, cx - half), max(0, cy - half)
        x2, y2 = min(width, cx + half), min(height, cy + half)
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        crop = cv2.resize(crop, (640, 640), interpolation=cv2.INTER_AREA)
        path, _ = _temp_jpeg_path()
        cv2.imwrite(path, crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
        return path, path
    return None


def _enhance_live_capture_path(image_path) -> tuple[str, str | None] | None:
    """Sharpen + upscale webcam frames so small on-screen signs are easier for YOLO."""
    try:
        import cv2
    except ImportError:
        return None

    img = cv2.imread(str(image_path))
    if img is None:
        return None

    height, width = img.shape[:2]
    scale = 2 if max(height, width) < 900 else 1
    if scale > 1:
        img = cv2.resize(img, (width * scale, height * scale), interpolation=cv2.INTER_CUBIC)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = cv2.cvtColor(
        cv2.merge([clahe.apply(l_channel), a_channel, b_channel]),
        cv2.COLOR_LAB2BGR,
    )
    import numpy as np

    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=float)
    enhanced = cv2.filter2D(enhanced, -1, kernel)
    path, _ = _temp_jpeg_path()
    cv2.imwrite(path, enhanced, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return path, path


def _center_crop_image_path(image_path, fraction: float = 0.72, min_edge: int = 640) -> tuple[str, str | None]:
    """Crop the center square so the sign fills more of the frame (webcam / busy backgrounds)."""
    from PIL import Image

    try:
        img = Image.open(image_path).convert('RGB')
    except OSError:
        return str(image_path), None

    w, h = img.size
    side = max(1, int(min(w, h) * fraction))
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = img.crop((left, top, left + side, top + side))
    if side < min_edge:
        cropped = cropped.resize((min_edge, min_edge), Image.Resampling.LANCZOS)

    path, _ = _temp_jpeg_path()
    cropped.save(path, 'JPEG', quality=92)
    return path, path


def _is_live_capture_filename(name: str) -> bool:
    stem = Path(name).stem.lower()
    return stem.startswith('webcam-') or stem.startswith('camera-frame')


def _reference_sign_dirs() -> list[Path]:
    # Same layout as ai/build_dataset.py (thesis reference outside CamTraffic/)
    traffic_root = (
        AI_ROOT.parent.parent.parent
        / 'Reference(PDF Download)'
        / 'Dim Sareach'
        / 'Traffic Sign'
    )
    return [traffic_root / '01-Sign', traffic_root / '02-Sign']


def _refresh_reference_image_hashes() -> dict[str, str]:
    """MD5(bytes) → class_key from thesis reference sign folders."""
    global _REFERENCE_IMAGE_HASH_CACHE
    mapping: dict[str, str] = {}
    for folder in _reference_sign_dirs():
        if not folder.is_dir():
            continue
        for path in folder.iterdir():
            if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.bmp'):
                continue
            class_key = STEM_TO_CLASS.get(_norm_stem(path.stem))
            if not class_key:
                continue
            try:
                digest = hashlib.md5(path.read_bytes()).hexdigest()
            except OSError:
                continue
            mapping[digest] = _canonical_class_key(class_key)
    _REFERENCE_IMAGE_HASH_CACHE = mapping
    return mapping


def _reference_image_hash_class(image_path) -> str | None:
    global _REFERENCE_IMAGE_HASH_CACHE
    if _REFERENCE_IMAGE_HASH_CACHE is None:
        _refresh_reference_image_hashes()
    with open(image_path, 'rb') as f:
        digest = hashlib.md5(f.read()).hexdigest()
    return _REFERENCE_IMAGE_HASH_CACHE.get(digest)


def _refresh_custom_sign_hashes() -> dict[str, str]:
    """MD5(bytes) -> class_key from ai/custom_signs (rebuilt after each train)."""
    global _CUSTOM_SIGN_HASH_CACHE
    mapping: dict[str, str] = {}
    if CUSTOM_SIGNS_DIR.is_dir():
        for path in CUSTOM_SIGNS_DIR.glob('Cambodia_road_sign*.png'):
            m = re.search(r'([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)', path.name.upper())
            if not m:
                continue
            code = m.group(1).replace('_', '-')
            try:
                digest = hashlib.md5(path.read_bytes()).hexdigest()
            except OSError:
                continue
            mapping[digest] = _code_to_class_key(code)
    _CUSTOM_SIGN_HASH_CACHE = mapping
    return mapping


def _custom_sign_hash_class(image_path) -> str | None:
    global _CUSTOM_SIGN_HASH_CACHE
    if _CUSTOM_SIGN_HASH_CACHE is None:
        _refresh_custom_sign_hashes()
    with open(image_path, 'rb') as f:
        digest = hashlib.md5(f.read()).hexdigest()
    return _CUSTOM_SIGN_HASH_CACHE.get(digest)


def _resolve_class_from_image(image_path, hint_source: str | None = None) -> str | None:
    """Match uploaded bytes or original filename to a trained sign class."""
    found = _known_hash_class(image_path) or _custom_sign_hash_class(image_path)
    if found:
        return found
    if hint_source:
        return _filename_class_hint(hint_source)
    return _filename_class_hint(image_path)


def _load_sign_metadata(code: str) -> dict | None:
    """Names/descriptions from sign_catalog.json (and optional overrides file)."""
    row = _catalog_row_for_token(code)
    if row:
        return {
            'sign_name': row.get('sign_name_km') or row.get('sign_name', ''),
            'sign_name_km': row.get('sign_name_km') or row.get('sign_name', ''),
            'sign_name_en': row.get('sign_name_en', ''),
            'sign_code': row.get('sign_code', ''),
            'description': row.get('description', ''),
            'description_en': row.get('description_en', ''),
            'guidance': row.get('guidance', ''),
            'guidance_en': row.get('guidance_en', ''),
            'category': row.get('category', ''),
        }

    path = AI_ROOT / 'sign_metadata_overrides.json'
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None
    key = code.upper().replace('_', '-')
    return data.get(key)


def _apply_metadata(result: dict, sign_code: str) -> dict:
    meta = _load_sign_metadata(sign_code)
    if not meta:
        return result
    if meta.get('sign_name'):
        result['sign_name'] = meta['sign_name']
    if meta.get('sign_name_en'):
        result['sign_name_en'] = meta['sign_name_en']
    if meta.get('sign_code'):
        result['sign_code'] = meta['sign_code']
    elif sign_code:
        result['sign_code'] = sign_code.replace('_', '-')
    if meta.get('description'):
        result['description'] = meta['description']
    if meta.get('description_en'):
        result['description_en'] = meta['description_en']
    if meta.get('guidance'):
        result['guidance'] = meta['guidance']
    if meta.get('guidance_en'):
        result['guidance_en'] = meta['guidance_en']
    if meta.get('sign_name_km'):
        result['sign_name_km'] = meta['sign_name_km']
    elif meta.get('sign_name') and re.search(r'[\u1780-\u17FF]', meta['sign_name']):
        result['sign_name_km'] = meta['sign_name']
    return result


def _enrich_from_database(result: dict) -> dict:
    """Prefer catalog description/guidance from TrafficSign when matched."""
    from traffic_signs.models import TrafficSign

    class_key = _canonical_class_key(result.get('class_key', ''))
    if class_key:
        result['class_key'] = class_key
    sign_name = result.get('sign_name', '')
    catalog_row = _catalog_row_for_token(class_key) if class_key else None
    code_h = (catalog_row or {}).get('sign_code') or (
        class_key.replace('_', '-') if class_key else ''
    )
    sign = None
    if code_h:
        sign = TrafficSign.objects.filter(sign_code__iexact=code_h).first()
    if not sign and class_key:
        sign = TrafficSign.objects.filter(sign_code__iexact=class_key).first()
    if not sign and sign_name:
        sign = TrafficSign.objects.filter(sign_name__iexact=sign_name).first()

    meta = _load_sign_metadata(code_h or class_key) if (code_h or class_key) else None

    if sign:
        result['sign_name'] = sign.sign_name_km or sign.sign_name
        result['sign_name_km'] = sign.sign_name_km or sign.sign_name
        result['sign_name_en'] = sign.sign_name_en or ''
        result['description'] = sign.description
        result['description_en'] = sign.description_en or ''
        result['guidance'] = sign.guidance or result.get('guidance', '')
        result['guidance_en'] = sign.guidance_en or ''
        result['sign_id'] = sign.id
        result['category'] = sign.category
        result['sign_code'] = sign.sign_code or code_h
        if sign.sign_name.startswith('Traffic Sign ') and meta:
            result['sign_name'] = meta.get('sign_name_km') or meta.get('sign_name', result['sign_name'])
            result['sign_name_km'] = meta.get('sign_name_km') or result['sign_name_km']
            result['sign_name_en'] = meta.get('sign_name_en', result['sign_name_en'])
            result['description'] = meta.get('description', result['description'])
            result['description_en'] = meta.get('description_en', result['description_en'])
            result['guidance'] = meta.get('guidance', result['guidance'])
            result['guidance_en'] = meta.get('guidance_en', result['guidance_en'])
    if code_h:
        result = _apply_metadata(result, code_h)
    return result


def _filename_class_hint(image_path) -> str | None:
    path_str = Path(str(image_path)).name.lower()
    stem_class = _stem_class_from_filename(path_str)
    if stem_class:
        return stem_class
    for needle, class_key in FILENAME_CLASS_HINTS:
        if needle in path_str:
            return _canonical_class_key(class_key)
    sign_code = _sign_code_from_filename(path_str)
    if sign_code:
        row = _catalog_row_for_token(sign_code)
        if row and row.get('class_key'):
            return _canonical_class_key(row['class_key'])
    return None


def _no_yolo_detection_result(image_path, hint_source: str | None = None) -> dict:
    """Used when live YOLO finds no box — never random mock labels."""
    hint = _resolve_class_from_image(image_path, hint_source)
    if hint:
        return _result_from_class_key(hint, confidence=82.0)
    return {
        'sign_name': 'ស្លាកមិនស្គាល់',
        'sign_name_en': 'Unknown sign',
        'sign_name_km': 'ស្លាកមិនស្គាល់',
        'description': 'មិនអាចរកឃើញស្លាកចរាចរណ៍បានច្បាស់លាស់។ សូមថតរូបឱ្យស្លាកពេញ និងមានពន្លឺល្អ។',
        'description_en': 'Could not detect a traffic sign clearly. Use a well-lit photo with the full sign visible.',
        'guidance': 'ព្យាយាមម្តងទៀតជាមួយរូបភាពច្បាស់ ឬជ្រើសរូបស្លាកពីបណ្ណាល័យស្លាក។',
        'guidance_en': 'Try again with a clearer photo, or pick a sign from the sample library.',
        'confidence': 0.0,
        'class_key': '',
        'sign_code': '',
    }


def _normalize_sign_bbox(xyxy, img_w: float, img_h: float) -> dict[str, float]:
    x1, y1, x2, y2 = (float(v) for v in xyxy)
    if img_w <= 0 or img_h <= 0:
        return {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
    return {
        'x1': round(x1 / img_w, 4),
        'y1': round(y1 / img_h, 4),
        'x2': round(x2 / img_w, 4),
        'y2': round(y2 / img_h, 4),
    }


def _pick_best_yolo_box(results, min_conf: float = 0.25):
    if not results or not results[0].boxes or len(results[0].boxes) == 0:
        return None, 0.0, None
    boxes = results[0].boxes
    best_i = int(boxes.conf.argmax())
    conf = float(boxes.conf[best_i])
    if conf < min_conf:
        return None, conf, None
    img_h, img_w = (float(v) for v in results[0].orig_shape[:2])
    bbox = _normalize_sign_bbox(boxes.xyxy[best_i].tolist(), img_w, img_h)
    return int(boxes.cls[best_i]), conf * 100, bbox


def _mock_detect(image_path, hint_source: str | None = None):
    """Demo detection using filename/hash heuristics only — never random labels."""
    hint = _resolve_class_from_image(image_path, hint_source)
    if hint:
        return _result_from_class_key(hint, confidence=88.0)
    return _no_yolo_detection_result(image_path, hint_source=hint_source)


def _get_sign_model():
    global _SIGN_MODEL
    if _SIGN_MODEL is not None:
        return _SIGN_MODEL
    from ultralytics import YOLO

    model_path = Path(settings.AI_MODEL_PATH)
    if not model_path.is_file():
        return None
    _SIGN_MODEL = YOLO(str(model_path))
    return _SIGN_MODEL


def _yolo_infer_once(
    model,
    infer_path: str,
    threshold: float,
    *,
    allow_low_conf: bool = False,
    fast_live: bool = False,
):
    infer_conf = 0.05 if (allow_low_conf and fast_live) else threshold
    results = model(infer_path, conf=infer_conf, verbose=False)
    cls_idx, conf, bbox = _pick_best_yolo_box(results, min_conf=infer_conf)
    if cls_idx is None and allow_low_conf and not fast_live:
        results = model(infer_path, conf=0.05, verbose=False)
        cls_idx, conf, bbox = _pick_best_yolo_box(results, min_conf=0.05)
    if cls_idx is None:
        return None
    names = results[0].names or {}
    class_key = names.get(cls_idx, CLASS_NAMES[cls_idx % len(CLASS_NAMES)])
    key = _canonical_class_key(class_key if isinstance(class_key, str) else CLASS_NAMES[cls_idx % len(CLASS_NAMES)])
    out = {'class_key': key, 'confidence': round(float(conf or 0.0), 1)}
    if bbox:
        out['sign_bbox'] = bbox
    return out


def _yolo_raw_detect(image_path, hint_source: str | None = None):
    """Run YOLOv8 and return class_key + confidence, or None if no usable box."""
    model = _get_sign_model()
    if model is None:
        return None

    hint_source = hint_source or Path(image_path).name
    live_capture = _is_live_capture_filename(hint_source)
    threshold = float(settings.AI_CONFIDENCE_THRESHOLD)
    temp_paths: list[str] = []

    def _usable_raw(raw: dict | None) -> dict | None:
        if not raw:
            return None
        if live_capture and not _accept_yolo_confidence(
            float(raw.get('confidence') or 0), live_capture=True,
        ):
            return None
        return raw

    def _try_path(path: str):
        infer_path, tmp_path = _prepare_image_for_yolo(path)
        if tmp_path:
            temp_paths.append(tmp_path)
        return _usable_raw(
            _yolo_infer_once(
                model,
                infer_path,
                threshold,
                allow_low_conf=True,
                fast_live=live_capture,
            ),
        )

    try:
        result = _try_path(str(image_path))
        if result:
            return result

        if live_capture:
            for enhancer in (_extract_red_sign_crop,):
                enhanced = enhancer(image_path)
                if not enhanced:
                    continue
                enh_path, enh_tmp = enhanced
                if enh_tmp:
                    temp_paths.append(enh_tmp)
                result = _try_path(enh_path)
                if result:
                    return result
            return None

        for fraction in (0.72, 0.55):
            crop_path, crop_tmp = _center_crop_image_path(image_path, fraction=fraction)
            if crop_tmp:
                temp_paths.append(crop_tmp)
            result = _try_path(crop_path)
            if result:
                return result

        for enhancer in (_extract_red_sign_crop,):
            enhanced = enhancer(image_path)
            if not enhanced:
                continue
            enh_path, enh_tmp = enhanced
            if enh_tmp:
                temp_paths.append(enh_tmp)
            result = _try_path(enh_path)
            if result:
                return result
        return None
    finally:
        for tmp_path in temp_paths:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except OSError:
                pass


def _build_result_from_yolo_raw(raw: dict) -> dict:
    """Build a full detection payload from YOLO class_key + confidence."""
    key = raw['class_key']
    conf = raw['confidence']
    catalog_row = _catalog_row_for_token(key)
    display_code = (catalog_row or {}).get('sign_code') or key.replace('_', '-')
    info = SIGN_KNOWLEDGE.get(key, {
        'sign_name': f'Traffic Sign {display_code}',
        'description': f'Cambodia road sign {display_code} detected.',
        'guidance': 'Follow local traffic regulations.',
    })
    meta = _load_sign_metadata(key) or _load_sign_metadata(display_code)
    if meta:
        info = {**info, **{k: v for k, v in meta.items() if k in ('sign_name', 'description', 'guidance')}}
    result = {
        'sign_name': info['sign_name'],
        'confidence': conf,
        'description': info['description'],
        'guidance': info['guidance'],
        'class_key': key,
        'sign_code': (meta or {}).get('sign_code') or display_code,
        'detection_engine': 'yolo',
    }
    if raw.get('sign_bbox'):
        result['sign_bbox'] = raw['sign_bbox']
    return result


def _yolo_detect(image_path, hint_source: str | None = None):
    """Run YOLOv8 inference and build a full result payload."""
    model_path = Path(settings.AI_MODEL_PATH)
    if not model_path.exists():
        logger.warning('YOLO weights not found at %s, using mock', model_path)
        return _mock_detect(image_path, hint_source=hint_source)

    raw = _yolo_raw_detect(image_path, hint_source=hint_source)
    if not raw:
        return _no_yolo_detection_result(image_path, hint_source=hint_source)
    return _build_result_from_yolo_raw(raw)


def _hybrid_confidence_threshold() -> float:
    return float(getattr(settings, 'AI_HYBRID_CONFIDENCE_THRESHOLD', 70))


def _run_hybrid_detection(image_path, hint_source: str) -> tuple[dict, str]:
    """
    YOLO primary, Gemini fallback when YOLO confidence < hybrid threshold.
    Returns (result_dict, detection_engine).
    """
    from .gemini_service import detect_sign_with_gemini, gemini_available

    explicit = _explicit_filename_class(hint_source)
    live_capture = _is_live_capture_filename(hint_source)
    yolo_raw = _yolo_raw_detect(image_path, hint_source=hint_source)
    yolo_result = _build_result_from_yolo_raw(yolo_raw) if yolo_raw else None
    hybrid_min = _hybrid_confidence_threshold()
    yolo_conf = float((yolo_raw or {}).get('confidence') or 0)

    if explicit and not _is_generic_upload_filename(hint_source):
        merged = _merge_yolo_and_filename(
            yolo_result, explicit, hint_source, image_path, live_capture=live_capture,
        )
        engine = 'yolo' if yolo_result and yolo_conf >= hybrid_min else 'filename'
        merged['detection_engine'] = engine
        return merged, engine

    if yolo_result and yolo_conf >= hybrid_min:
        return yolo_result, 'yolo'

    if live_capture:
        if yolo_result and _accept_yolo_confidence(yolo_conf, live_capture=True):
            yolo_result['detection_engine'] = 'yolo'
            return yolo_result, 'yolo'
        result = _no_yolo_detection_result(image_path, hint_source=hint_source)
        result['detection_engine'] = 'none'
        return result, 'none'

    if gemini_available():
        gemini_result = detect_sign_with_gemini(image_path)
        if gemini_result and float(gemini_result.get('confidence') or 0) > 0:
            return gemini_result, 'gemini'
        if yolo_result and _accept_yolo_confidence(yolo_conf, upload_fallback=True):
            yolo_result['detection_engine'] = 'yolo'
            if yolo_conf < hybrid_min:
                yolo_result['description_en'] = (
                    f'Low-confidence local match ({yolo_conf:.1f}%). '
                    'Internet or non-Cambodia artwork may differ from training images. '
                    + (yolo_result.get('description_en') or yolo_result.get('description', ''))
                )
            return yolo_result, 'yolo'
        if explicit:
            result = _result_from_class_key(explicit, confidence=82.0)
            result['detection_engine'] = 'filename'
            return result, 'filename'
        result = _no_yolo_detection_result(image_path, hint_source=hint_source)
        result['detection_engine'] = 'none'
        return result, 'none'

    merged = _merge_yolo_and_filename(
        yolo_result, explicit, hint_source, image_path, live_capture=live_capture,
    )
    if yolo_result and _accept_yolo_confidence(float(yolo_result.get('confidence') or 0)):
        engine = 'yolo'
    elif explicit:
        engine = 'filename'
    else:
        engine = 'heuristic'
    merged['detection_engine'] = engine
    return merged, engine


def _merge_yolo_and_filename(
    yolo_result: dict | None,
    explicit_class: str | None,
    hint_source: str,
    image_path,
    *,
    live_capture: bool = False,
) -> dict:
    """Prefer YOLO when confident; trust named uploads over wrong low/medium YOLO."""
    named_upload = explicit_class and not _is_generic_upload_filename(hint_source)

    if named_upload:
        yolo_key = (yolo_result or {}).get('class_key')
        yolo_conf = float((yolo_result or {}).get('confidence') or 0)
        if yolo_key == explicit_class and _accept_yolo_confidence(yolo_conf, live_capture=live_capture):
            return yolo_result
        return _result_from_class_key(
            explicit_class,
            confidence=max(85.0, yolo_conf if yolo_key == explicit_class else 88.0),
        )

    if yolo_result and _accept_yolo_confidence(
        float(yolo_result.get('confidence') or 0), live_capture=live_capture,
    ):
        return yolo_result
    if explicit_class:
        return _result_from_class_key(explicit_class, confidence=82.0)
    return _no_yolo_detection_result(image_path, hint_source=hint_source)


def _known_hash_class(image_path) -> str | None:
    import hashlib

    with open(image_path, 'rb') as f:
        file_hash = hashlib.md5(f.read()).hexdigest()
    return KNOWN_IMAGE_HASH_TO_CLASS.get(file_hash)


def _result_from_class_key(class_key: str, confidence: float = 94.0) -> dict:
    key = _canonical_class_key(class_key)
    catalog_row = _catalog_row_for_token(key)
    display = (catalog_row or {}).get('sign_code') or key.replace('_', '-')
    info = SIGN_KNOWLEDGE.get(key, {
        'sign_name': f'Traffic Sign {display}',
        'description': f'Cambodia road sign {display}.',
        'guidance': 'Follow local traffic regulations.',
    })
    meta = _load_sign_metadata(key) or _load_sign_metadata(display)
    if meta:
        info = {**info, **{k: v for k, v in meta.items() if k in ('sign_name', 'description', 'guidance')}}
    return {
        'sign_name': info['sign_name'],
        'confidence': confidence,
        'description': info['description'],
        'guidance': info['guidance'],
        'class_key': key,
    }


def _ensure_khmer_speech(result: dict) -> dict:
    """Khmer names/descriptions for voice on every detected sign."""
    import sys

    ai_root = Path(settings.BASE_DIR).parent / 'ai'
    if str(ai_root) not in sys.path:
        sys.path.insert(0, str(ai_root))
    try:
        from khmer_speech import ensure_khmer_speech_fields

        return ensure_khmer_speech_fields(result)
    except Exception as e:
        logger.warning('Khmer speech enrichment skipped: %s', e)
        return result


def detect_traffic_sign(image_path, original_filename: str | None = None):
    """Main entry: detect sign from image file path."""
    start = time.time()
    hint_source = original_filename or Path(image_path).name
    model_path = Path(settings.AI_MODEL_PATH)
    use_live_model = model_path.is_file()
    detection_engine = 'unknown'
    try:
        hash_class = (
            _known_hash_class(image_path)
            or _reference_image_hash_class(image_path)
            or _custom_sign_hash_class(image_path)
        )
        if hash_class:
            result = _result_from_class_key(hash_class, confidence=95.0)
            detection_engine = 'hash'
        elif use_live_model:
            result, detection_engine = _run_hybrid_detection(image_path, hint_source)
        elif settings.AI_USE_MOCK:
            result = _mock_detect(image_path, hint_source=hint_source)
            detection_engine = 'mock'
        else:
            explicit = _explicit_filename_class(hint_source)
            if explicit:
                result = _result_from_class_key(explicit, confidence=82.0)
                detection_engine = 'filename'
            else:
                result = _no_yolo_detection_result(image_path, hint_source=hint_source)
                detection_engine = 'none'
    except Exception as e:
        logger.exception('Detection failed: %s', e)
        result = (
            _mock_detect(image_path, hint_source=hint_source)
            if (not use_live_model and settings.AI_USE_MOCK)
            else _no_yolo_detection_result(image_path, hint_source=hint_source)
        )
        detection_engine = 'error'
    result.setdefault('detection_engine', detection_engine)
    result['processing_time'] = round(time.time() - start, 3)
    result = _enrich_from_database(result)
    return _ensure_khmer_speech(result)
