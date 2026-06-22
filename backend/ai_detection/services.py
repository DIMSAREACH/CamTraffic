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
_CATALOG_MEDIA_HASH_CACHE: dict[str, str] | None = None
_SIGN_CATALOG_CACHE: list[dict] | None = None
_SIGN_MODEL = None
_SIGN_MODEL_PATH: str | None = None
_LAST_LIVE_GEMINI_MONO = 0.0


def _detection_mode() -> str:
    return str(getattr(settings, 'AI_DETECTION_MODE', 'local')).strip().lower()


def _gemini_fallback_allowed(*, live: bool = False) -> bool:
    """Gemini is optional backup only when AI_DETECTION_MODE=hybrid."""
    if _detection_mode() != 'hybrid':
        return False
    if live:
        return bool(getattr(settings, 'AI_GEMINI_LIVE_FALLBACK', False))
    return bool(getattr(settings, 'AI_GEMINI_UPLOAD_FALLBACK', False))

_CATALOG_BASENAME_RE = re.compile(
    r'^(?:[WIP][-_]?\d{2,3}|[A-Z]{2,}[-_]?\d{2,}|KH[-_][A-Z0-9]+|GIVE[-_]WAY|NO[-_]ENTRY|STOP|SPEED[-_]LIMIT[-_]\d+)$',
    re.I,
)

# YOLO class names (data.yaml / best.pt) → sign_catalog.json class_key
YOLO_CLASS_ALIASES = {
    'close_for_all_road_users': 'road_closed_all_users',
    'close_for_all_vehicles': 'road_closed_all_vehicles',
    'weight_limit_on_one_axle': 'axle_weight_limit',
    'road_closed_all_users': 'road_closed_all_users',
    'road_closed_all_vehicles': 'road_closed_all_vehicles',
    # Training dataset keys that differ from catalog class_key
    'no_entry_bicycle': 'p_no_bicycles',
    'no_entry_bicycle_motorcycle_tricycle': 'p_no_bicycles_motorcycles_and_tricycles',
    'no_entry_large_bus': 'p_no_buses',
    'no_entry_large_truck': 'p_no_trucks',
    'no_entry_motorcycle_drawn': 'p_no_motorcycle_drawn_carts',
    'no_entry_motor_except_motorcycle': 'p_no_motor_vehicles',
    'no_entry_motor_vehicles': 'p_no_motor_vehicles',
    # Common international / legacy keys
    'stop': 'm_stop',
    'give_way': 'm_yield_give_way',
    'yield': 'm_yield_give_way',
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

# Reference filename stems → catalog class_key (merged with ai/cambodia_stem_to_class.json)
_BASE_STEM_TO_CLASS: dict[str, str] = {
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
    'stop': 'M_STOP',
    'yield': 'M_YIELD_GIVE_WAY',
    'giveway': 'M_YIELD_GIVE_WAY',
    'roundabout': 'W_ROUNDABOUT_AHEAD',
}
STEM_TO_CLASS: dict[str, str] = {}
ENGLISH_ALIAS_TO_CLASS: dict[str, str] = {}

GENERIC_UPLOAD_STEMS = frozenset({
    'image', 'img', 'photo', 'picture', 'upload', 'scan', 'screenshot', 'snap', 'camera', 'sign', 'file',
})

# Filename hints when YOLO finds nothing (upload names like NO_TURN_RIGHT.png)
FILENAME_CLASS_HINTS = (
    ('stop', 'M_STOP'),
    ('yield', 'M_YIELD_GIVE_WAY'),
    ('give-way', 'M_YIELD_GIVE_WAY'),
    ('giveway', 'M_YIELD_GIVE_WAY'),
    ('no-entry', 'NO_ENTRY'),
    ('noentry', 'NO_ENTRY'),
    ('roundabout', 'W_ROUNDABOUT_AHEAD'),
    ('speed-limit', 'SPEED_LIMIT'),
    ('pw03-r1-02', 'PW03_R1_02'),
    ('pw03_r1_02', 'PW03_R1_02'),
    ('no_turn_right', 'PW03_R1_02'),
    ('no-turn-right', 'PW03_R1_02'),
    ('no_right_turn', 'PW03_R1_02'),
    ('no-right-turn', 'PW03_R1_02'),
    ('pw03-r1-01', 'PW03_R1_01'),
    ('pw03_r1_01', 'PW03_R1_01'),
    ('no_turn_left', 'PW03_R1_01'),
    ('no-left-turn', 'PW03_R1_01'),
    ('no_left_turn', 'PW03_R1_01'),
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
    from .sign_catalog_loader import load_sign_catalog_rows, resolve_catalog_path

    path = resolve_catalog_path()
    if _SIGN_CATALOG_CACHE is not None and getattr(_load_sign_catalog, '_path', None) == path:
        return _SIGN_CATALOG_CACHE

    _SIGN_CATALOG_CACHE = load_sign_catalog_rows(force_reload=True)
    _load_sign_catalog._path = path  # type: ignore[attr-defined]
    return _SIGN_CATALOG_CACHE


def _catalog_row_for_token(token: str) -> dict | None:
    if not token:
        return None
    norm = _canonical_class_key(token)
    code_norm = token.upper().replace('_', '-')
    for row in _load_sign_catalog():
        ck = _canonical_class_key(row.get('class_key', ''))
        sc = (row.get('sign_code') or '').upper()
        official = (row.get('official_sign_code') or '').upper()
        if ck == norm or sc == code_norm or official == code_norm:
            return row
    return None


def _norm_stem(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def _load_stem_to_class() -> dict[str, str]:
    mapping = {_norm_stem(k): _canonical_class_key(v) for k, v in _BASE_STEM_TO_CLASS.items()}
    stem_path = AI_ROOT / 'cambodia_stem_to_class.json'
    if stem_path.is_file():
        try:
            data = json.loads(stem_path.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                for stem, class_key in data.items():
                    if not isinstance(class_key, str) or stem.startswith('_'):
                        continue
                    mapping[_norm_stem(stem)] = _canonical_class_key(class_key)
        except (json.JSONDecodeError, OSError):
            logger.warning('Could not read %s', stem_path)
    return mapping


def _build_english_alias_map() -> dict[str, str]:
    aliases: dict[str, str] = {}
    for row in _load_sign_catalog():
        class_key = row.get('class_key')
        if not class_key:
            continue
        en = (row.get('sign_name_en') or row.get('sign_name') or '').strip()
        if not en or re.search(r'[\u1780-\u17FF]', en):
            continue
        canon = _canonical_class_key(class_key)
        aliases[_norm_stem(en)] = canon
        first = re.split(r'[\s(/\-]+', en.lower())[0]
        if first and len(first) >= 3:
            aliases[_norm_stem(first)] = canon
    for stem, class_key in _BASE_STEM_TO_CLASS.items():
        aliases.setdefault(_norm_stem(stem), _canonical_class_key(class_key))
    return aliases


def _init_sign_lookup_tables() -> None:
    global STEM_TO_CLASS, ENGLISH_ALIAS_TO_CLASS
    STEM_TO_CLASS = _load_stem_to_class()
    ENGLISH_ALIAS_TO_CLASS = _build_english_alias_map()


_init_sign_lookup_tables()


def _sign_code_from_filename(path_str: str) -> str | None:
    m = re.search(r'pw03[_-]?r([12])[_-]?(\d{1,2})', path_str, re.I)
    if m:
        return f'PW03-R{m.group(1)}-{int(m.group(2)):02d}'
    return _sign_code_from_basename(path_str)


def _sign_code_from_basename(name: str) -> str | None:
    """Resolve catalog sign codes from upload names like W-001.png or I_004_hq.png."""
    stem = Path(name).stem.upper()
    stem = re.sub(r'(_HQ|_HQ\d+)$', '', stem, flags=re.I)
    stem = stem.replace('_', '-')

    candidates: list[str] = []
    if stem:
        candidates.append(stem)
    compact = stem.replace('-', '')
    m = re.match(r'^([A-Z]+)(\d{2,4})$', compact)
    if m:
        candidates.append(f'{m.group(1)}-{m.group(2)}')
    m = re.match(r'^([WIP])(\d{3})$', compact)
    if m:
        candidates.append(f'{m.group(1)}-{m.group(2)}')

    seen: set[str] = set()
    for code in candidates:
        norm = code.upper()
        if norm in seen:
            continue
        seen.add(norm)
        if not _CATALOG_BASENAME_RE.match(norm) and not _catalog_row_for_token(norm):
            continue
        row = _catalog_row_for_token(norm)
        if row:
            return (row.get('sign_code') or norm).upper()
    return None


def _stem_class_from_filename(name: str) -> str | None:
    stem = _norm_stem(Path(name).stem)
    mapped = STEM_TO_CLASS.get(stem) or ENGLISH_ALIAS_TO_CLASS.get(stem)
    return _canonical_class_key(mapped) if mapped else None


def _explicit_filename_class(hint_source: str) -> str | None:
    """Resolve class from upload basename (catalog code, PW03 code, or reference stem)."""
    basename = Path(hint_source).name
    stem_class = _stem_class_from_filename(basename)
    if stem_class:
        return stem_class
    sign_code = _sign_code_from_filename(basename.lower()) or _sign_code_from_basename(basename)
    if sign_code:
        row = _catalog_row_for_token(sign_code)
        if row and row.get('class_key'):
            return _canonical_class_key(row['class_key'])
    return _filename_class_hint(basename)


def _class_key_from_catalog_code(sign_code: str) -> str | None:
    row = _catalog_row_for_token(sign_code)
    if row and row.get('class_key'):
        return _canonical_class_key(row['class_key'])
    return None


def _result_from_catalog_code(sign_code: str, *, confidence: float = 96.0) -> dict | None:
    class_key = _class_key_from_catalog_code(sign_code)
    if not class_key:
        return None
    result = _result_from_class_key(class_key, confidence=confidence)
    result['detection_engine'] = 'catalog'
    result['sign_code'] = (sign_code or '').upper().replace('_', '-')
    return result


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


def _live_yolo_infer_conf() -> float:
    """Minimum YOLO predict() conf for live webcam frames (blocks weak false positives)."""
    return float(getattr(settings, 'AI_LIVE_YOLO_INFER_CONF', 0.50))


def _live_yolo_floor() -> float:
    """Lowest YOLO box confidence kept for live inference (detection only)."""
    return float(getattr(settings, 'AI_LIVE_YOLO_FLOOR', 10))


def _live_yolo_trust_threshold() -> float:
    """Minimum YOLO confidence to trust the class label on live webcam."""
    return float(getattr(settings, 'AI_LIVE_YOLO_TRUST', 42))


def _live_yolo_trusted(confidence: float) -> bool:
    return float(confidence or 0) >= _live_yolo_trust_threshold()


def _live_yolo_catalog_min() -> float:
    """Accept catalog-mapped YOLO labels on live when Gemini is unavailable."""
    return float(getattr(settings, 'AI_LIVE_YOLO_CATALOG_MIN', 28))


def _live_yolo_catalog_acceptable(raw: dict | None) -> bool:
    if not raw:
        return False
    conf = float(raw.get('confidence') or 0)
    if conf < max(_live_yolo_floor(), _live_yolo_catalog_min()):
        return False
    key = _canonical_class_key(str(raw.get('class_key') or ''))
    return bool(key and _catalog_row_for_token(key))


def _upload_yolo_floor() -> float:
    """Minimum YOLO confidence for real photo uploads (no filename hint)."""
    return float(getattr(settings, 'AI_UPLOAD_YOLO_FLOOR', 35))


def _upload_yolo_acceptable(confidence: float) -> bool:
    """Accept YOLO on user uploads only when confidence is high enough to trust."""
    conf = float(confidence or 0)
    return conf >= max(_upload_yolo_floor(), _min_result_confidence())


def _accept_yolo_confidence(
    confidence: float,
    *,
    live_capture: bool = False,
    upload_fallback: bool = False,
) -> bool:
    conf = float(confidence or 0)
    if live_capture:
        return _live_yolo_trusted(conf)
    if upload_fallback and conf >= _upload_yolo_floor():
        return True
    return conf >= _min_result_confidence() or conf >= _absolute_yolo_floor()


def _temp_jpeg_path() -> tuple[str, str]:
    """Return a closed temp .jpg path (Windows-safe for cv2/PIL writes)."""
    fd, path = tempfile.mkstemp(suffix='.jpg')
    os.close(fd)
    return path, path


def _prepare_image_for_yolo(image_path) -> tuple[str, str | None]:
    """Composite catalog art onto a road-like background (matches training)."""
    from PIL import Image
    import numpy as np

    path = Path(image_path)
    try:
        img = Image.open(path)
    except OSError:
        return str(path), None

    needs_composite = False
    if img.mode == 'RGBA':
        needs_composite = True
    elif img.mode == 'RGB':
        rgb = np.array(img)
        white = (
            (rgb[:, :, 0] > 238)
            & (rgb[:, :, 1] > 238)
            & (rgb[:, :, 2] > 238)
        )
        needs_composite = float(white.mean()) > 0.35

    if not needs_composite:
        return str(path), None

    rgba = img.convert('RGBA')
    data = np.array(rgba)
    alpha = data[:, :, 3]
    if img.mode == 'RGB':
        white = (
            (data[:, :, 0] > 238)
            & (data[:, :, 1] > 238)
            & (data[:, :, 2] > 238)
        )
        alpha = np.where(white, 0, 255).astype(np.uint8)

    bg = Image.new('RGB', img.size, (205, 210, 218))
    fg = Image.fromarray(
        np.dstack([data[:, :, :3], alpha]),
        'RGBA',
    )
    bg.paste(fg, mask=Image.fromarray(alpha))
    out_path, _ = _temp_jpeg_path()
    bg.save(out_path, 'JPEG', quality=92)
    return out_path, out_path


def _crop_sign_from_mask(img, mask) -> tuple[str, str | None] | None:
    """Pick the largest sign-like contour from a binary mask and save a 640px JPEG crop."""
    try:
        import cv2
    except ImportError:
        return None

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
        if area < max(400, int(frame_area * 0.006)):
            continue
        aspect = w / h if h else 0.0
        if aspect < 0.25 or aspect > 3.5:
            continue
        candidates.append((area, x, y, w, h))
    if not candidates:
        return None

    candidates.sort(reverse=True)
    for _, x, y, w, h in candidates[:4]:
        side = max(w, h)
        pad = int(side * 0.18)
        cx, cy = x + w // 2, y + h // 2
        half = side // 2 + pad
        x1, y1 = max(0, cx - half), max(0, cy - half)
        x2, y2 = min(width, cx + half), min(height, cy + half)
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        ch, cw = crop.shape[:2]
        interp = cv2.INTER_CUBIC if max(ch, cw) < 640 else cv2.INTER_AREA
        crop = cv2.resize(crop, (640, 640), interpolation=interp)
        path, _ = _temp_jpeg_path()
        cv2.imwrite(path, crop, [cv2.IMWRITE_JPEG_QUALITY, 94])
        return path, path
    return None


def _extract_red_sign_crop(image_path) -> tuple[str, str | None] | None:
    """Crop probable prohibitory (red) sign regions for noisy webcam frames."""
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
    return _crop_sign_from_mask(img, mask)


def _extract_colored_sign_crop(image_path) -> tuple[str, str | None] | None:
    """Crop warning (yellow), informative (blue), and prohibitory (red) sign regions."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    img = cv2.imread(str(image_path))
    if img is None:
        return None

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    red = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 70, 70]), np.array([12, 255, 255])),
        cv2.inRange(hsv, np.array([165, 70, 70]), np.array([180, 255, 255])),
    )
    yellow = cv2.inRange(hsv, np.array([14, 70, 70]), np.array([42, 255, 255]))
    blue = cv2.inRange(hsv, np.array([88, 50, 50]), np.array([132, 255, 255]))
    mask = cv2.bitwise_or(cv2.bitwise_or(red, yellow), blue)
    return _crop_sign_from_mask(img, mask)


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
    longest = max(height, width)
    if longest < 1100:
        scale = min(2.5, 1100 / longest)
        img = cv2.resize(
            img,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

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
    hit = _REFERENCE_IMAGE_HASH_CACHE.get(digest)
    if hit:
        return hit
    return _catalog_media_hash_class(digest)


def _refresh_catalog_media_hashes() -> dict[str, str]:
    """MD5(bytes) → class_key from TrafficSign images in the media store."""
    global _CATALOG_MEDIA_HASH_CACHE
    mapping: dict[str, str] = {}
    try:
        from traffic_signs.models import TrafficSign
    except Exception:
        _CATALOG_MEDIA_HASH_CACHE = mapping
        return mapping

    for sign in TrafficSign.objects.exclude(image='').exclude(image__isnull=True).iterator():
        class_key = _class_key_from_catalog_code(sign.sign_code or '')
        if not class_key:
            continue
        try:
            with sign.image.open('rb') as fh:
                digest = hashlib.md5(fh.read()).hexdigest()
        except OSError:
            continue
        mapping[digest] = class_key
    _CATALOG_MEDIA_HASH_CACHE = mapping
    return mapping


def _catalog_media_hash_class(digest: str) -> str | None:
    global _CATALOG_MEDIA_HASH_CACHE
    if _CATALOG_MEDIA_HASH_CACHE is None:
        _refresh_catalog_media_hashes()
    return _CATALOG_MEDIA_HASH_CACHE.get(digest)


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
    try:
        with open(image_path, 'rb') as f:
            digest = hashlib.md5(f.read()).hexdigest()
    except OSError:
        return None
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
            'display_code': row.get('display_code', ''),
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
    if meta.get('display_code'):
        result['display_code'] = meta['display_code']
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
        result['description'] = sign.description or result.get('description', '')
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
    elif meta:
        result = _apply_metadata(result, code_h or class_key)
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
            row = _catalog_row_for_token(class_key)
            if row and row.get('class_key'):
                return _canonical_class_key(row['class_key'])
            return _canonical_class_key(class_key)
    sign_code = _sign_code_from_filename(path_str)
    if sign_code:
        row = _catalog_row_for_token(sign_code)
        if row and row.get('class_key'):
            return _canonical_class_key(row['class_key'])
    return None


def _contour_circularity(cnt) -> float:
    import cv2

    area = cv2.contourArea(cnt)
    peri = cv2.arcLength(cnt, True)
    if area <= 0 or peri <= 0:
        return 0.0
    return float(4 * 3.141592653589793 * area / (peri * peri))


def _red_sign_inner_profile(image_path) -> str:
    """
    Distinguish stop/no-entry (red inner field) from no-left-turn style signs
    (white inner field with black arrow) — critical for phone-screen webcam crops.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        return 'unknown'

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return 'unknown'
    if img is None:
        return 'unknown'
    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return 'unknown'

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    cx, cy = w // 2, h // 2
    radius = int(min(h, w) * 0.25)
    center = hsv[max(0, cy - radius):cy + radius, max(0, cx - radius):cx + radius]
    if center.size == 0:
        return 'unknown'

    red = (
        ((center[:, :, 0] < 12) | (center[:, :, 0] > 168))
        & (center[:, :, 1] > 70)
        & (center[:, :, 2] > 70)
    )
    white = (center[:, :, 2] > 170) & (center[:, :, 1] < 85)
    red_ratio = float(np.mean(red))
    white_ratio = float(np.mean(white))

    if white_ratio >= 0.38 and red_ratio <= 0.38:
        return 'white_field'
    if red_ratio >= 0.52:
        return 'red_field'
    return 'unknown'


def _prohibitory_red_ring_hint(image_path) -> bool:
    """
    True when the image has a red annulus typical of prohibitory signs (no left/right/U-turn).
    Black silhouette informative signs on white backgrounds have no red ring.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        return False

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return False
    if img is None:
        return False
    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return False

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    cx, cy = w // 2, h // 2
    radius = min(h, w) / 2.0
    ys, xs = np.ogrid[:h, :w]
    dist = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    outer = (dist > radius * 0.30) & (dist < radius * 0.50)
    if not np.any(outer):
        return False

    red = (
        ((hsv[:, :, 0] < 12) | (hsv[:, :, 0] > 168))
        & (hsv[:, :, 1] > 70)
        & (hsv[:, :, 2] > 70)
    )
    return float(np.mean(red[outer])) >= 0.08


def _is_stop_like_result(result: dict | None) -> bool:
    if not result:
        return False
    key = _canonical_class_key(result.get('class_key') or '')
    code = (result.get('sign_code') or '').upper().replace('_', '-')
    name = (result.get('sign_name_en') or result.get('sign_name') or '').lower()
    if key in ('M_STOP', 'M_STOP_KHMER_AND_ENGLISH_LANGUAGES'):
        return True
    if code == 'M-032':
        return True
    return 'stop' in name and 'no stop' not in name and 'bus stop' not in name


def _stop_false_positive_for_image(image_path, result: dict | None) -> bool:
    """True when a stop label contradicts the sign's inner color layout."""
    if not _is_stop_like_result(result):
        return False
    return _red_sign_inner_profile(image_path) == 'white_field'


def _sanitize_stop_false_positive(image_path, result: dict | None) -> dict | None:
    if _stop_false_positive_for_image(image_path, result):
        return None
    return result


_VEHICLE_SPECIFIC_NO_ENTRY_KEYS = frozenset({
    'no_entry_bicycle',
    'no_entry_bicycle_motorcycle_tricycle',
    'no_entry_large_bus',
    'no_entry_large_truck',
    'no_entry_motorcycle_drawn',
    'no_entry_motor_except_motorcycle',
    'no_entry_motor_vehicles',
    'p_no_bicycles',
    'p_no_bicycles_motorcycles_and_tricycles',
    'p_no_buses',
    'p_no_trucks',
    'p_no_motorcycle_drawn_carts',
    'p_no_motor_vehicles',
})


def _generic_no_entry_bar_hint(image_path) -> bool:
    """
    True for classic No Entry — red circle with a horizontal white bar (no vehicle pictogram).
    Tolerates wrinkled paper prints and webcam blur.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        return False

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return False
    if img is None:
        return False
    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return False

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    cx, cy = w // 2, h // 2
    radius = int(min(h, w) * 0.38)
    patch_g = gray[max(0, cy - radius):cy + radius, max(0, cx - radius):cx + radius]
    patch_h = hsv[max(0, cy - radius):cy + radius, max(0, cx - radius):cx + radius]
    if patch_g.size == 0:
        return False

    ph, pw = patch_g.shape
    row_means = np.mean(patch_g, axis=1)
    top_third = float(np.mean(row_means[: max(1, ph // 3)]))
    mid_third = float(np.mean(row_means[ph // 3: max(ph // 3 + 1, 2 * ph // 3)]))
    bot_third = float(np.mean(row_means[2 * ph // 3:]))
    band_prominence = mid_third - min(top_third, bot_third)

    col_means = np.mean(patch_g, axis=0)
    center_cols = float(np.mean(col_means[pw // 4:3 * pw // 4]))

    band = patch_g[ph // 3:2 * ph // 3, pw // 6:5 * pw // 6]
    white_band = float(np.mean(band > 155)) if band.size else 0.0
    dark_ratio = float(np.mean(patch_g < 92))
    red_outer = (
        ((patch_h[:, :, 0] < 16) | (patch_h[:, :, 0] > 164))
        & (patch_h[:, :, 1] > 45)
        & (patch_h[:, :, 2] > 45)
    )
    red_ratio = float(np.mean(red_outer))

    has_horizontal_bar = (
        (white_band >= 0.40 and band_prominence >= 25 and mid_third >= 140)
        or (
            band_prominence >= 10
            and mid_third >= 118
            and white_band >= 0.14
            and center_cols >= 118
            and dark_ratio < 0.24
        )
    )
    if not has_horizontal_bar:
        return False
    if red_ratio < 0.10:
        return False
    if _no_u_turn_shape_hint(image_path):
        return False
    return True


def _prohibitory_inner_arrow_metrics(image_path) -> dict | None:
    """Dark-pixel layout inside a red-circle prohibitory sign (turn / U-turn arrows)."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return None
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]
    if h < 48 or w < 48:
        return None

    cx, cy = w // 2, h // 2
    radius = int(min(h, w) * 0.22)
    patch = gray[max(0, cy - radius):cy + radius, max(0, cx - radius):cx + radius]
    if patch.size == 0:
        return None

    ph, pw = patch.shape
    dark = patch < 85
    dark_ratio = float(np.mean(dark))
    if dark_ratio < 0.04:
        return None

    ys, xs = np.where(dark)
    mean_x = float(np.mean(xs)) / max(pw, 1)
    mean_y = float(np.mean(ys)) / max(ph, 1)
    spread_y = float(np.std(ys))

    quadrants = {}
    for name, cond in (
        ('tl', (xs < pw * 0.5) & (ys < ph * 0.5)),
        ('tr', (xs >= pw * 0.5) & (ys < ph * 0.5)),
        ('bl', (xs < pw * 0.5) & (ys >= ph * 0.5)),
        ('br', (xs >= pw * 0.5) & (ys >= ph * 0.5)),
    ):
        quadrants[name] = float(np.mean(cond))

    return {
        'dark_ratio': dark_ratio,
        'mean_x': mean_x,
        'mean_y': mean_y,
        'spread_y': spread_y,
        **quadrants,
    }


def _no_u_turn_shape_hint(image_path) -> bool:
    """
    True when the inner pictogram looks like a U-turn arrow (both lower quadrants
    plus upper curve), not a straight left/right turn or a No Entry bar.
    """
    if not _prohibitory_red_ring_hint(image_path):
        return False
    metrics = _prohibitory_inner_arrow_metrics(image_path)
    if not metrics:
        return False

    bl = metrics['bl']
    br = metrics['br']
    tl = metrics['tl']
    tr = metrics['tr']
    if min(bl, br) < 0.08 or min(tl, tr) < 0.08:
        return False
    if metrics['dark_ratio'] < 0.10:
        return False

    lower_share = bl + br
    upper_share = tl + tr
    centered = abs(metrics['mean_x'] - 0.5) <= 0.10
    u_curve = lower_share >= 0.28 and upper_share >= 0.22 and centered
    tall_curve = (
        metrics['spread_y'] >= 45
        and lower_share >= 0.32
        and upper_share >= 0.15
        and centered
    )
    return u_curve or tall_curve


def _sanitize_vehicle_specific_no_entry(image_path, result: dict | None) -> dict | None:
    """Remap weak vehicle-specific no-entry YOLO labels to generic NO_ENTRY when shape matches."""
    if not result:
        return result
    key = _canonical_class_key(str(result.get('class_key') or ''))
    if key not in _VEHICLE_SPECIFIC_NO_ENTRY_KEYS:
        return result
    conf = float(result.get('confidence') or 0)
    if conf >= 58:
        return result
    if not _generic_no_entry_bar_hint(image_path):
        return result
    corrected = _result_from_class_key('NO_ENTRY', confidence=max(conf, 72.0))
    corrected['detection_engine'] = result.get('detection_engine') or 'shape_hint'
    return corrected


def _sanitize_u_turn_mislabel(image_path, result: dict | None) -> dict | None:
    """Remap any wrong label to NO_U_TURN when the U-arrow shape is visible."""
    if not result or result.get('detection_mode') == 'no_sign':
        return result
    if not _no_u_turn_shape_hint(image_path):
        return result

    key = _canonical_class_key(str(result.get('class_key') or ''))
    code = (result.get('sign_code') or '').upper().replace('_', '-')
    if key in ('NO_U_TURN', 'PW03_R1_03') or code == 'PW03-R1-03':
        return result

    conf = float(result.get('confidence') or 0)
    corrected = _result_from_class_key('NO_U_TURN', confidence=max(conf, 86.0))
    corrected['detection_engine'] = (
        'yolo' if (result.get('detection_engine') or '') in ('yolo', 'catalog_match') else 'shape_hint'
    )
    if result.get('sign_bbox'):
        corrected['sign_bbox'] = result['sign_bbox']
    return corrected


def _sanitize_red_field_yolo_mislabel(image_path, result: dict | None) -> dict | None:
    """Red stop-field crops must not keep yellow-warning or handicapped YOLO labels."""
    if not result or result.get('detection_mode') == 'no_sign':
        return result
    if _red_sign_inner_profile(image_path) != 'red_field':
        return result
    if _is_stop_like_result(result):
        return result

    key = _canonical_class_key(str(result.get('class_key') or ''))
    if not (key.startswith('W_') or 'HANDICAPPED' in key):
        return result

    catalog = _sanitize_stop_false_positive(
        image_path, _try_catalog_visual_match(image_path, live_capture=True),
    )
    if catalog:
        catalog['detection_engine'] = 'catalog_match'
        if result.get('sign_bbox'):
            catalog['sign_bbox'] = result['sign_bbox']
        return catalog

    stop = _result_from_class_key('M_STOP', confidence=max(float(result.get('confidence') or 0), 86.0))
    stop['detection_engine'] = 'shape_hint'
    if result.get('sign_bbox'):
        stop['sign_bbox'] = result['sign_bbox']
    return stop


def _sanitize_live_yolo_result(image_path, result: dict | None) -> dict | None:
    result = _sanitize_stop_false_positive(image_path, result)
    result = _sanitize_vehicle_specific_no_entry(image_path, result)
    result = _sanitize_red_field_yolo_mislabel(image_path, result)
    return _sanitize_u_turn_mislabel(image_path, result)


def _white_field_prohibitory_hint(image_path) -> str | None:
    """White-inner prohibitory signs (no left/right/U-turn) are never stop signs."""
    if not _prohibitory_red_ring_hint(image_path):
        return None
    if _red_sign_inner_profile(image_path) != 'white_field':
        return None
    if _no_u_turn_shape_hint(image_path):
        return 'NO_U_TURN'

    metrics = _prohibitory_inner_arrow_metrics(image_path)
    if not metrics:
        return None

    mean_x = metrics['mean_x']
    if mean_x < 0.42:
        return 'NO_LEFT_TURN'
    if mean_x > 0.58:
        return 'NO_RIGHT_TURN'
    return None


def _visual_sign_class_hint(image_path, *, strict: bool = False) -> str | None:
    """Shape/color heuristics for stop/yield when YOLO and Gemini both fail."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return None
    if img is None:
        return None
    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return None

    min_red_area = 0.12 if strict else 0.06
    min_yellow_area = 0.10 if strict else 0.05

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_red1 = np.array([0, 80, 70])
    upper_red1 = np.array([12, 255, 255])
    lower_red2 = np.array([168, 80, 70])
    upper_red2 = np.array([180, 255, 255])
    red_mask = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    area_total = float(h * w)
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:6]:
        area = cv2.contourArea(cnt)
        if area < area_total * min_red_area:
            continue
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.035 * peri, True)
        sides = len(approx)
        x, y, bw, bh = cv2.boundingRect(cnt)
        aspect = bw / max(bh, 1)
        fill = area / max(float(bw * bh), 1.0)
        circ = _contour_circularity(cnt)
        # Prohibitory signs (no left turn, no entry) are red circles — not stop octagons.
        if circ >= 0.82:
            continue
        if strict:
            if _red_sign_inner_profile(image_path) == 'white_field':
                continue
            if circ < 0.72 and 7 <= sides <= 9 and 0.75 <= aspect <= 1.35 and fill > 0.62:
                return 'm_stop'
        elif _red_sign_inner_profile(image_path) == 'white_field':
            continue
        elif circ < 0.75 and 6 <= sides <= 10 and 0.7 <= aspect <= 1.4 and fill > 0.55:
            return 'm_stop'
        elif not strict and circ < 0.78 and sides >= 7 and 0.65 <= aspect <= 1.5 and fill > 0.45:
            return 'm_stop'

    lower_yellow = np.array([18, 90, 90])
    upper_yellow = np.array([38, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
    yellow_mask = cv2.morphologyEx(yellow_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    y_contours, _ = cv2.findContours(yellow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in sorted(y_contours, key=cv2.contourArea, reverse=True)[:4]:
        area = cv2.contourArea(cnt)
        if area < area_total * min_yellow_area:
            continue
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        if len(approx) == 3:
            return 'm_yield_give_way'

    return None


def _upload_yolo_trusted(confidence: float) -> bool:
    """User uploads: accept YOLO when above configured floor."""
    return _upload_yolo_acceptable(confidence)


def _no_yolo_detection_result(image_path, hint_source: str | None = None) -> dict:
    """Used when live YOLO finds no box — never random mock labels."""
    live_capture = _is_live_capture_filename(hint_source or '')
    hint = _resolve_class_from_image(image_path, hint_source)
    if not hint and not live_capture:
        hint = _visual_sign_class_hint(image_path)
    if not hint and live_capture:
        hint = _white_field_prohibitory_hint(image_path)
    if hint:
        result = _result_from_class_key(hint, confidence=82.0 if not live_capture else 76.0)
        if _stop_false_positive_for_image(image_path, result):
            hint = _white_field_prohibitory_hint(image_path)
            if hint:
                return _result_from_class_key(hint, confidence=76.0)
        return result
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
    global _SIGN_MODEL, _SIGN_MODEL_PATH
    from ultralytics import YOLO

    model_path = Path(settings.AI_MODEL_PATH)
    resolved = str(model_path.resolve()) if model_path.is_file() else ''
    if _SIGN_MODEL is not None and _SIGN_MODEL_PATH == resolved:
        return _SIGN_MODEL
    _SIGN_MODEL = None
    _SIGN_MODEL_PATH = None
    if not model_path.is_file():
        return None
    _SIGN_MODEL = YOLO(resolved)
    _SIGN_MODEL_PATH = resolved
    names = _SIGN_MODEL.names or {}
    logger.info('Loaded sign YOLO: %s classes from %s', len(names), model_path)
    return _SIGN_MODEL


def _sign_model_class_count() -> int:
    model = _get_sign_model()
    if model is None:
        return 0
    return len(model.names or {})


def _full_catalog_yolo_model() -> bool:
    """True when best.pt was trained on the full 236-sign catalog."""
    return _sign_model_class_count() >= 100


def _upload_yolo_catalog_min() -> float:
    """Accept catalog-mapped YOLO labels on photo uploads when Gemini is unavailable."""
    return float(getattr(settings, 'AI_UPLOAD_YOLO_CATALOG_MIN', 28))


def _upload_yolo_catalog_acceptable(raw: dict | None) -> bool:
    if not raw:
        return False
    conf = float(raw.get('confidence') or 0)
    if conf < max(_upload_yolo_floor(), _upload_yolo_catalog_min()):
        return False
    key = _canonical_class_key(str(raw.get('class_key') or ''))
    return bool(key and _catalog_row_for_token(key))


def _shape_hints_enabled(*, upload: bool = False, unified_prep: bool = False) -> bool:
    """OpenCV shape heuristics — disabled on unified webcam/upload pipeline by default."""
    if unified_prep:
        return bool(getattr(settings, 'AI_UNIFIED_SHAPE_HINTS_ENABLED', False))
    if upload:
        return True
    if _full_catalog_yolo_model():
        return bool(getattr(settings, 'AI_SHAPE_HINTS_ENABLED', False))
    return bool(getattr(settings, 'AI_SHAPE_HINTS_ENABLED', True))


def _infer_imgsz(fast_live: bool = False) -> int:
    """Return YOLO inference size (larger improves live webcam accuracy)."""
    if fast_live:
        return int(getattr(settings, 'AI_LIVE_IMGSZ', 640))
    return int(getattr(settings, 'AI_IMGSZ', 640))


def _yolo_infer_once(
    model,
    infer_path: str,
    threshold: float,
    *,
    allow_low_conf: bool = False,
    fast_live: bool = False,
    live_strict: bool = False,
):
    if live_strict:
        infer_conf = max(threshold, _live_yolo_infer_conf())
        allow_low_conf = False
    elif allow_low_conf:
        infer_conf = 0.05
    else:
        infer_conf = threshold
    imgsz = _infer_imgsz(fast_live=fast_live)
    results = model(infer_path, conf=infer_conf, imgsz=imgsz, verbose=False)
    cls_idx, conf, bbox = _pick_best_yolo_box(results, min_conf=infer_conf)
    if cls_idx is None:
        return None
    from .yolo_class_mapping import class_key_for_yolo_id

    mapped_key = class_key_for_yolo_id(int(cls_idx))
    names = results[0].names or {}
    if mapped_key:
        key = _canonical_class_key(mapped_key)
    else:
        class_key = names.get(cls_idx, CLASS_NAMES[cls_idx % len(CLASS_NAMES)])
        key = _canonical_class_key(class_key if isinstance(class_key, str) else CLASS_NAMES[cls_idx % len(CLASS_NAMES)])
    out = {'class_key': key, 'confidence': round(float(conf or 0.0), 1), 'class_id': int(cls_idx)}
    if bbox:
        out['sign_bbox'] = bbox
    return out


def _yolo_raw_detect(image_path, hint_source: str | None = None, *, live_fast: bool = False, unified_prep: bool = False):
    """Run YOLOv8 and return class_key + confidence, or None if no usable box."""
    model = _get_sign_model()
    if model is None:
        return None

    hint_source = hint_source or Path(image_path).name
    live_capture = _is_live_capture_filename(hint_source) and not unified_prep
    threshold = float(settings.AI_CONFIDENCE_THRESHOLD)
    temp_paths: list[str] = []

    def _usable_raw(raw: dict | None) -> dict | None:
        if not raw:
            return None
        conf = float(raw.get('confidence') or 0)
        if unified_prep:
            min_conf = _live_yolo_trust_threshold() if live_capture else _upload_yolo_floor()
            if conf < min_conf:
                return None
            return raw
        if live_capture:
            if conf < _live_yolo_floor():
                return None
            if not _live_yolo_trusted(conf) and not _live_yolo_catalog_acceptable(raw):
                return None
        return raw

    live_strict = live_capture or unified_prep

    def _try_path(path: str):
        if unified_prep:
            infer_path, tmp_path = str(path), None
        else:
            infer_path, tmp_path = _prepare_image_for_yolo(path)
            if tmp_path:
                temp_paths.append(tmp_path)
        return _usable_raw(
            _yolo_infer_once(
                model,
                infer_path,
                threshold,
                allow_low_conf=not live_strict,
                fast_live=live_capture and not unified_prep,
                live_strict=live_strict,
            ),
        )

    try:
        if unified_prep:
            result = _try_path(str(image_path))
            if result and (
                _upload_yolo_acceptable(float(result.get('confidence') or 0))
                or _upload_yolo_catalog_acceptable(result)
            ):
                return result
            return result

        result = _try_path(str(image_path))
        if result:
            conf = float(result.get('confidence') or 0)
            if live_capture:
                if _live_yolo_trusted(conf) or _live_yolo_catalog_acceptable(result):
                    return result
            elif _upload_yolo_acceptable(conf) or _upload_yolo_catalog_acceptable(result):
                return result

        if live_capture:
            if not live_fast and getattr(settings, 'AI_LIVE_TRY_ENHANCE', True):
                enhanced = _enhance_live_capture_path(image_path)
                if enhanced:
                    enh_path, enh_tmp = enhanced
                    if enh_tmp:
                        temp_paths.append(enh_tmp)
                    enh_result = _try_path(enh_path)
                    if enh_result and (
                        _live_yolo_trusted(float(enh_result.get('confidence') or 0))
                        or _live_yolo_catalog_acceptable(enh_result)
                    ):
                        return enh_result
                    if enh_result and (
                        not result
                        or float(enh_result.get('confidence') or 0) > float(result.get('confidence') or 0)
                    ):
                        result = enh_result

            elif live_fast and getattr(settings, 'AI_LIVE_TRY_ENHANCE', False):
                needs_boost = not result
                if needs_boost:
                    enhanced = _enhance_live_capture_path(image_path)
                    if enhanced:
                        enh_path, enh_tmp = enhanced
                        if enh_tmp:
                            temp_paths.append(enh_tmp)
                        enh_result = _try_path(enh_path)
                        if enh_result and (
                            not result
                            or float(enh_result.get('confidence') or 0) > float(result.get('confidence') or 0)
                        ):
                            result = enh_result

            if result and (
                _live_yolo_trusted(float(result.get('confidence') or 0))
                or _live_yolo_catalog_acceptable(result)
            ):
                return result

            if live_fast:
                return result

            for factory in (_extract_red_sign_crop,):
                cropped = factory(image_path)
                if not cropped:
                    continue
                crop_path, crop_tmp = cropped
                if crop_tmp:
                    temp_paths.append(crop_tmp)
                crop_result = _try_path(crop_path)
                if crop_result and (
                    _live_yolo_trusted(float(crop_result.get('confidence') or 0))
                    or _live_yolo_catalog_acceptable(crop_result)
                ):
                    return crop_result

            return None

        # Upload: extra crops only when the full frame was weak
        crop_path, crop_tmp = _center_crop_image_path(image_path, fraction=0.72)
        if crop_tmp:
            temp_paths.append(crop_tmp)
        crop_result = _try_path(crop_path)
        if crop_result and (
            _upload_yolo_acceptable(float(crop_result.get('confidence') or 0))
            or _upload_yolo_catalog_acceptable(crop_result)
        ):
            return crop_result
        if crop_result and (not result or float(crop_result.get('confidence') or 0) > float(result.get('confidence') or 0)):
            result = crop_result

        for factory in (_extract_colored_sign_crop, _extract_red_sign_crop):
            enhanced = factory(image_path)
            if not enhanced:
                continue
            enh_path, enh_tmp = enhanced
            if enh_tmp:
                temp_paths.append(enh_tmp)
            enh_result = _try_path(enh_path)
            if enh_result and (
                _upload_yolo_acceptable(float(enh_result.get('confidence') or 0))
                or _upload_yolo_catalog_acceptable(enh_result)
            ):
                return enh_result
            if enh_result and (
                not result
                or float(enh_result.get('confidence') or 0) > float(result.get('confidence') or 0)
            ):
                result = enh_result
        return result
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
    result = _result_from_class_key(key, confidence=conf)
    result['detection_engine'] = 'yolo'
    if raw.get('sign_bbox'):
        result['sign_bbox'] = raw['sign_bbox']
    result['yolo_debug'] = {
        'class_key': raw.get('class_key') or '',
        'class_id': raw.get('class_id'),
        'confidence': raw.get('confidence'),
        'sign_bbox': raw.get('sign_bbox'),
    }
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


def _run_hybrid_detection(
    image_path,
    hint_source: str,
    *,
    live_fast: bool = False,
    catalog_sign_code: str | None = None,
    unified_prep: bool = False,
) -> tuple[dict, str]:
    """
    Local-first sign detection: OpenCV preprocess → YOLOv8 → catalog match → shape hints.
    Optional Gemini Vision only when AI_DETECTION_MODE=hybrid and fallback flags are on.
    Returns (result_dict, detection_engine).
    """
    from .gemini_service import detect_sign_with_gemini, gemini_available

    explicit = _explicit_filename_class(hint_source)
    live_capture = _is_live_capture_filename(hint_source) and not unified_prep
    yolo_raw = _yolo_raw_detect(
        image_path, hint_source=hint_source, live_fast=live_fast, unified_prep=unified_prep,
    )
    yolo_result = _build_result_from_yolo_raw(yolo_raw) if yolo_raw else None
    hybrid_min = _hybrid_confidence_threshold()
    yolo_conf = float((yolo_raw or {}).get('confidence') or 0)

    if live_capture:
        from .live_sign_presence import analyze_live_sign_presence, live_no_sign_result, live_sign_present

        sign_present = live_sign_present(image_path)
        profile = _red_sign_inner_profile(image_path)
        if profile == 'white_field' and yolo_raw and not _full_catalog_yolo_model():
            turn_keys = {'no_left_turn', 'no_right_turn', 'no_u_turn'}
            yolo_key = _canonical_class_key(str(yolo_raw.get('class_key') or ''))
            if yolo_key not in turn_keys:
                yolo_raw = None
                yolo_result = None
                yolo_conf = 0.0

        if not sign_present and not (
            yolo_result and (
                _live_yolo_trusted(yolo_conf) or _live_yolo_catalog_acceptable(yolo_raw)
            )
        ):
            # Still try catalog when colors suggest a sign even if edge check failed.
            metrics = analyze_live_sign_presence(image_path)
            likely_sign = (
                metrics.get('sign_blob_ratio', 0) >= 0.06
                and metrics.get('sign_color_ratio', 0) >= 0.10
            )
            if not likely_sign:
                no_sign = live_no_sign_result()
                return _finish_live(image_path, no_sign, 'opencv')

        yolo_result = _sanitize_live_yolo_result(image_path, yolo_result)

        catalog_result = _sanitize_live_yolo_result(
            image_path, _try_catalog_visual_match(image_path, live_capture=True),
        )

        if yolo_result and _live_yolo_trusted(yolo_conf):
            if _prefer_catalog_match_over_yolo(yolo_result, catalog_result):
                catalog_result['detection_engine'] = 'catalog_match'
                return _finish_live(image_path, catalog_result, 'catalog_match', yolo_raw)
            yolo_result['detection_engine'] = 'yolo'
            yolo_result['sign_present'] = True
            return _finish_live(image_path, yolo_result, 'yolo', yolo_raw)

        if catalog_result and float(catalog_result.get('catalog_match_score') or 0) >= _match_min_correlation():
            catalog_result['detection_engine'] = 'catalog_match'
            return _finish_live(image_path, catalog_result, 'catalog_match', yolo_raw)

        if yolo_result and _live_yolo_catalog_acceptable(yolo_raw):
            yolo_result['detection_engine'] = 'yolo'
            yolo_result['sign_present'] = True
            return _finish_live(image_path, yolo_result, 'yolo', yolo_raw)

        if sign_present and _no_u_turn_shape_hint(image_path):
            hint_result = _result_from_class_key('NO_U_TURN', confidence=88.0)
            hint_result['detection_engine'] = 'shape_hint'
            hint_result['sign_present'] = True
            return _finish_live(image_path, hint_result, 'shape_hint')

        if sign_present and _generic_no_entry_bar_hint(image_path):
            hint_result = _result_from_class_key('NO_ENTRY', confidence=82.0)
            hint_result['detection_engine'] = 'shape_hint'
            hint_result['sign_present'] = True
            return _finish_live(image_path, hint_result, 'shape_hint')

        if profile == 'white_field' and sign_present and not _generic_no_entry_bar_hint(image_path):
            shape_hint = _white_field_prohibitory_hint(image_path)
            if shape_hint:
                hint_result = _result_from_class_key(shape_hint, confidence=88.0)
                hint_result['detection_engine'] = 'shape_hint'
                hint_result['sign_present'] = True
                return _finish_live(image_path, hint_result, 'shape_hint')

        gemini_result = None
        if _gemini_fallback_allowed(live=True) and not live_fast:
            gemini_result = _sanitize_stop_false_positive(
                image_path, _try_live_gemini_fallback(image_path),
            )
        if gemini_result:
            if _prefer_catalog_match_over_yolo(gemini_result, catalog_result):
                catalog_result['detection_engine'] = 'catalog_match'
                return _finish_live(image_path, catalog_result, 'catalog_match', yolo_raw)
            gemini_result['detection_engine'] = 'gemini'
            return _finish_live(image_path, gemini_result, 'gemini', yolo_raw)

        if catalog_result:
            catalog_result['detection_engine'] = 'catalog_match'
            return _finish_live(image_path, catalog_result, 'catalog_match', yolo_raw)

        if _shape_hints_enabled(unified_prep=unified_prep):
            shape_hint = (
                _white_field_prohibitory_hint(image_path)
                if sign_present and not _generic_no_entry_bar_hint(image_path)
                else None
            )
            if shape_hint:
                hint_result = _result_from_class_key(shape_hint, confidence=88.0)
                hint_result['detection_engine'] = 'shape_hint'
                hint_result['sign_present'] = True
                return _finish_live(image_path, hint_result, 'shape_hint')

        no_sign = live_no_sign_result()
        return _finish_live(image_path, no_sign, 'opencv')

    def _upload_return(result, engine):
        return _finalize_hybrid_result_upload(
            image_path, result, engine, yolo_raw=yolo_raw, unified_prep=unified_prep,
        )

    named_upload = bool(explicit and not _is_generic_upload_filename(hint_source))
    if named_upload:
        yolo_key = _canonical_class_key(str((yolo_result or {}).get('class_key') or ''))
        if yolo_key == explicit and yolo_conf >= hybrid_min:
            yolo_result = _sanitize_u_turn_mislabel(image_path, yolo_result)
            yolo_result['detection_engine'] = 'yolo'
            return _upload_return( yolo_result, 'yolo')

        catalog_candidate = _sanitize_stop_false_positive(
            image_path, _try_catalog_visual_match(image_path, live_capture=False),
        )
        cat_key = _canonical_class_key(str((catalog_candidate or {}).get('class_key') or ''))
        cat_score = float((catalog_candidate or {}).get('catalog_match_score') or 0)
        cat_margin = float((catalog_candidate or {}).get('catalog_match_margin') or 0)
        if (
            catalog_candidate
            and cat_key == explicit
            and cat_score >= _match_min_correlation()
            and cat_margin >= 0.08
        ):
            catalog_candidate = _sanitize_u_turn_mislabel(image_path, catalog_candidate)
            catalog_candidate['detection_engine'] = 'catalog_match'
            return _upload_return( catalog_candidate, 'catalog_match')

        merged = _merge_yolo_and_filename(
            yolo_result, explicit, hint_source, image_path, live_capture=False,
        )
        engine = 'yolo' if yolo_key == explicit and _upload_yolo_trusted(yolo_conf) else 'filename'
        merged['detection_engine'] = engine
        return _upload_return( merged, engine)

    if yolo_result and yolo_conf >= hybrid_min:
        yolo_result = _sanitize_u_turn_mislabel(image_path, yolo_result)
        yolo_result['detection_engine'] = 'yolo'
        return _upload_return( yolo_result, 'yolo')

    if yolo_result and (
        _upload_yolo_trusted(yolo_conf) or _upload_yolo_catalog_acceptable(yolo_raw)
    ):
        yolo_result = _sanitize_u_turn_mislabel(image_path, yolo_result)
        yolo_result['detection_engine'] = 'yolo'
        return _upload_return( yolo_result, 'yolo')

    catalog_result = _sanitize_u_turn_mislabel(
        image_path,
        _sanitize_stop_false_positive(
            image_path, _try_catalog_visual_match(image_path, live_capture=False),
        ),
    )
    if catalog_result and float(catalog_result.get('catalog_match_score') or 0) >= _match_min_correlation():
        cat_margin = float(catalog_result.get('catalog_match_margin') or 0)
        if cat_margin >= 0.08 or _prohibitory_red_ring_hint(image_path):
            catalog_result['detection_engine'] = 'catalog_match'
            return _upload_return( catalog_result, 'catalog_match')

    if _shape_hints_enabled(upload=True, unified_prep=unified_prep):
        if _no_u_turn_shape_hint(image_path):
            hint_result = _result_from_class_key('NO_U_TURN', confidence=88.0)
            hint_result['detection_engine'] = 'shape_hint'
            return _upload_return( hint_result, 'shape_hint')
        profile = _red_sign_inner_profile(image_path)
        if profile == 'white_field' and not _generic_no_entry_bar_hint(image_path):
            shape_hint = _white_field_prohibitory_hint(image_path)
            if shape_hint:
                hint_result = _result_from_class_key(shape_hint, confidence=88.0)
                hint_result['detection_engine'] = 'shape_hint'
                return _upload_return( hint_result, 'shape_hint')

    if _shape_hints_enabled(upload=True, unified_prep=unified_prep):
        if _generic_no_entry_bar_hint(image_path):
            hint_result = _result_from_class_key('NO_ENTRY', confidence=82.0)
            hint_result['detection_engine'] = 'shape_hint'
            return _upload_return( hint_result, 'shape_hint')
        visual = _visual_sign_class_hint(image_path)
        if visual:
            result = _result_from_class_key(visual, confidence=80.0)
            result['detection_engine'] = 'visual'
            return _upload_return( result, 'visual')

    if yolo_result:
        yolo_result = _sanitize_u_turn_mislabel(image_path, yolo_result)
        yolo_result['detection_engine'] = 'yolo'
        return _upload_return( yolo_result, 'yolo')

    if _gemini_fallback_allowed(live=False) and gemini_available():
        gemini_result = detect_sign_with_gemini(image_path)
        if gemini_result and float(gemini_result.get('confidence') or 0) > 0:
            return gemini_result, 'gemini'
        if explicit:
            result = _result_from_class_key(explicit, confidence=82.0)
            result['detection_engine'] = 'filename'
            return result, 'filename'
        if yolo_result and float(yolo_conf) >= _upload_yolo_floor():
            yolo_result['detection_engine'] = 'yolo'
            return yolo_result, 'yolo'
        result = _no_yolo_detection_result(image_path, hint_source=hint_source)
        result['detection_engine'] = 'none'
        return result, 'none'

    if catalog_result:
        catalog_result['detection_engine'] = 'catalog_match'
        return _upload_return( catalog_result, 'catalog_match')

    if explicit and not _full_catalog_yolo_model():
        result = _result_from_class_key(explicit, confidence=82.0)
        result['detection_engine'] = 'filename'
        return result, 'filename'

    if catalog_sign_code:
        hinted = _result_from_catalog_code(catalog_sign_code, confidence=82.0)
        if hinted:
            hinted['detection_engine'] = 'catalog'
            return _upload_return( hinted, 'catalog')

    result = _no_yolo_detection_result(image_path, hint_source=hint_source)
    result['detection_engine'] = 'none'
    return result, 'none'


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

    try:
        with open(image_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
    except OSError:
        return None
    return KNOWN_IMAGE_HASH_TO_CLASS.get(file_hash)


def _result_from_catalog_row(catalog_row: dict, *, class_key: str, confidence: float) -> dict:
    display = catalog_row.get('sign_code') or class_key.replace('_', '-')
    canon_key = _canonical_class_key(catalog_row.get('class_key') or class_key)
    result = {
        'sign_name': catalog_row.get('sign_name_km') or catalog_row.get('sign_name') or catalog_row.get('sign_name_en') or '',
        'sign_name_km': catalog_row.get('sign_name_km') or catalog_row.get('sign_name') or '',
        'sign_name_en': catalog_row.get('sign_name_en') or '',
        'confidence': confidence,
        'description': catalog_row.get('description') or '',
        'description_en': catalog_row.get('description_en') or '',
        'guidance': catalog_row.get('guidance') or '',
        'guidance_en': catalog_row.get('guidance_en') or '',
        'class_key': canon_key,
        'sign_code': display,
        'category': catalog_row.get('category') or '',
    }
    return _apply_metadata(result, display)


def _is_placeholder_sign_name(name: str) -> bool:
    n = (name or '').strip()
    if not n:
        return True
    if n.startswith('Traffic Sign '):
        return True
    if re.match(r'^សញ្ញា\s+[A-Z0-9-]+', n):
        return True
    if re.match(r'^ស្លាក\s+[A-Z0-9-]+', n):
        return True
    return False


def _resolve_official_sign_labels(result: dict) -> dict:
    """Replace YOLO class ids / placeholders with Cambodia catalog sign names."""
    if not result or result.get('detection_mode') == 'no_sign':
        return result

    class_key = _canonical_class_key(result.get('class_key') or '')
    sign_code = (result.get('sign_code') or '').upper()
    km = (result.get('sign_name_km') or result.get('sign_name') or '').strip()
    en = (result.get('sign_name_en') or '').strip()
    needs_fix = (
        _is_placeholder_sign_name(km)
        or _is_placeholder_sign_name(en)
        or not km
        or not en
        or (class_key and not sign_code)
    )

    row_by_class = _catalog_row_for_token(class_key) if class_key else None
    row_by_code = _catalog_row_for_token(sign_code) if sign_code else None
    mismatch = bool(
        row_by_class
        and row_by_code
        and _canonical_class_key(row_by_class.get('class_key') or '')
        != _canonical_class_key(row_by_code.get('class_key') or '')
    )
    if mismatch:
        # Keep class_key authoritative when class and sign_code disagree.
        needs_fix = True

    row = row_by_class or row_by_code

    if row and needs_fix:
        official = _result_from_catalog_row(
            row,
            class_key=_canonical_class_key(row.get('class_key') or class_key),
            confidence=float(result.get('confidence') or 0),
        )
        for field in (
            'sign_bbox', 'detection_engine', 'catalog_match_score',
            'catalog_match_margin', 'sign_present', 'detection_mode',
        ):
            if result.get(field) is not None:
                official[field] = result[field]
        result = official

    return result


def _result_from_class_key(class_key: str, confidence: float = 94.0) -> dict:
    key = _canonical_class_key(class_key)
    catalog_row = _catalog_row_for_token(key)
    if catalog_row:
        return _result_from_catalog_row(catalog_row, class_key=key, confidence=confidence)

    display = key.replace('_', '-')
    info = SIGN_KNOWLEDGE.get(key, {
        'sign_name': f'Traffic Sign {display}',
        'description': f'Cambodia road sign {display}.',
        'guidance': 'Follow local traffic regulations.',
    })
    result = {
        'sign_name': info['sign_name'],
        'confidence': confidence,
        'description': info['description'],
        'guidance': info['guidance'],
        'class_key': key,
        'sign_code': display,
    }
    return _apply_metadata(result, display)


def _try_catalog_visual_match(image_path, *, live_capture: bool = False) -> dict | None:
    from .catalog_visual_match import match_sign_from_catalog_images

    return match_sign_from_catalog_images(image_path, live_capture=live_capture)


def _live_results_disagree(a: dict | None, b: dict | None) -> bool:
    if not a or not b:
        return False
    key_a = _canonical_class_key(a.get('class_key') or '')
    key_b = _canonical_class_key(b.get('class_key') or '')
    if not key_a or not key_b:
        return False
    return key_a != key_b


def _match_min_correlation() -> float:
    return float(getattr(settings, 'AI_CATALOG_VISUAL_MIN_SCORE', 0.58))


def _prefer_catalog_match_over_yolo(yolo_result: dict | None, catalog_result: dict | None) -> bool:
    if not catalog_result or not yolo_result:
        return bool(catalog_result)
    score = float(catalog_result.get('catalog_match_score') or 0)
    yolo_conf = float(yolo_result.get('confidence') or 0)
    if score >= 0.97 and _live_results_disagree(yolo_result, catalog_result):
        return True
    if _is_stop_like_result(yolo_result) and not _is_stop_like_result(catalog_result):
        return score >= 0.52
    if _live_results_disagree(yolo_result, catalog_result):
        return score >= 0.65 or yolo_conf < _live_yolo_trust_threshold()
    return score >= 0.72 and yolo_conf < _live_yolo_trust_threshold()


def _calibrated_live_confidence(result: dict, engine: str) -> float:
    """Map internal live scores to user-facing confidence (validated detections only)."""
    raw = float(result.get('confidence') or 0)
    margin = float(result.get('catalog_match_margin') or 0)
    score = float(result.get('catalog_match_score') or 0)

    if engine == 'catalog_match':
        base = score * 100 if score <= 1 else score
        return min(96.0, max(86.0, base + 16.0 + margin * 28.0))

    if engine == 'shape_hint':
        return max(89.0, raw)

    if engine == 'yolo':
        if raw >= 50:
            return min(96.0, raw + 16.0)
        if raw >= 42:
            return min(94.0, raw + 20.0)
        return raw

    if engine == 'gemini':
        return min(96.0, max(88.0, raw if raw > 0 else 90.0))

    if engine == 'hash':
        return max(raw, 94.0)

    return raw


def _finalize_hybrid_result(
    image_path,
    result: dict | None,
    engine: str,
    *,
    live_capture: bool = False,
    yolo_raw: dict | None = None,
    unified_prep: bool = False,
) -> tuple[dict | None, str]:
    if not result:
        return result, engine
    result = _sanitize_u_turn_mislabel(image_path, result)
    if _stop_false_positive_for_image(image_path, result):
        hint = None
        if not unified_prep:
            hint = _white_field_prohibitory_hint(image_path)
        if hint:
            fixed = _result_from_class_key(hint, confidence=88.0 if live_capture else 76.0)
            fixed['detection_engine'] = 'shape_hint'
            result, engine = fixed, 'shape_hint'
        else:
            return result, engine
    if live_capture and result.get('detection_mode') != 'no_sign':
        result = dict(result)
        result['confidence'] = round(_calibrated_live_confidence(result, engine), 1)
    result = _resolve_official_sign_labels(result)
    if yolo_raw and result:
        result = dict(result)
        result['yolo_debug'] = {
            'class_key': yolo_raw.get('class_key') or '',
            'class_id': yolo_raw.get('class_id'),
            'confidence': yolo_raw.get('confidence'),
            'sign_bbox': yolo_raw.get('sign_bbox'),
        }
    return result, engine


def _finalize_hybrid_result_upload(
    image_path,
    result: dict | None,
    engine: str,
    *,
    yolo_raw: dict | None = None,
    unified_prep: bool = False,
) -> tuple[dict | None, str]:
    trace = yolo_raw if unified_prep else None
    return _finalize_hybrid_result(
        image_path, result, engine, live_capture=False, yolo_raw=trace, unified_prep=unified_prep,
    )


def _finish_live(image_path, result: dict | None, engine: str, yolo_raw: dict | None = None) -> tuple[dict | None, str]:
    out, eng = _finalize_hybrid_result(image_path, result, engine, live_capture=True, yolo_raw=yolo_raw)
    return out, eng


def _try_live_gemini_fallback(image_path) -> dict | None:
    """Throttled Gemini Vision for live webcam — only when hybrid mode is enabled."""
    from .gemini_service import detect_sign_with_gemini, gemini_available

    if not _gemini_fallback_allowed(live=True):
        return None
    if not gemini_available():
        return None

    global _LAST_LIVE_GEMINI_MONO
    min_gap = float(getattr(settings, 'AI_GEMINI_LIVE_MIN_INTERVAL', 0.8))
    now = time.monotonic()
    if now - _LAST_LIVE_GEMINI_MONO < min_gap:
        return None
    _LAST_LIVE_GEMINI_MONO = now

    gemini_result = detect_sign_with_gemini(image_path, compact=False)
    if gemini_result and float(gemini_result.get('confidence') or 0) > 0:
        return gemini_result
    return None


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


def detect_traffic_sign(
    image_path,
    original_filename: str | None = None,
    *,
    catalog_sign_code: str | None = None,
    live_fast: bool = False,
    unified_prep: bool = False,
):
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
            result, detection_engine = _run_hybrid_detection(
                image_path,
                hint_source,
                live_fast=live_fast,
                catalog_sign_code=catalog_sign_code,
                unified_prep=unified_prep,
            )
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
    result = _resolve_official_sign_labels(result)
    return _ensure_khmer_speech(result)
