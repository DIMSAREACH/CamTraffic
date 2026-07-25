"""
Vehicle detection for CamTraffic.

Supports:
1. Cambodia-trained YOLOv8 (Bus, Car, Moto, Truck, Tuk Tuk) — preferred production
2. Fallback: YOLOv8 COCO pretrained (car, motorcycle, bus, truck)
"""
import logging
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

# Cambodia Traffic.v1i.yolov8 class index → CamTraffic vehicle_type
CAMBODIA_VEHICLE_CLASSES: dict[int, str] = {
    0: 'bus',
    1: 'car',
    2: 'motorcycle',  # Moto
    3: 'truck',
    4: 'tuk_tuk',
}

# COCO class index → CamTraffic vehicle_type (fallback)
COCO_VEHICLE_CLASSES: dict[int, str] = {
    2: 'car',
    3: 'motorcycle',
    5: 'bus',
    7: 'truck',
}

VEHICLE_TYPE_LABELS: dict[str, str] = {
    'car': 'Car',
    'motorcycle': 'Motorcycle',
    'bus': 'Bus',
    'truck': 'Truck',
    'tuk_tuk': 'Tuk Tuk',
}

_VEHICLE_MODEL = None
_VEHICLE_MODEL_MODE: str | None = None  # 'cambodia' | 'coco'


def vehicle_detection_enabled() -> bool:
    return getattr(settings, 'AI_VEHICLE_ENABLED', True)


def _vehicle_model_path() -> str:
    return getattr(settings, 'AI_VEHICLE_MODEL', 'yolov8n.pt')


def _confidence_threshold() -> float:
    return float(getattr(settings, 'AI_VEHICLE_CONFIDENCE_THRESHOLD', 0.35))


def _ai_root() -> Path:
    return Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))


def _resolve_vehicle_model_path() -> Path:
    model_ref = _vehicle_model_path()
    ai_root = _ai_root()
    repo_root = ai_root.parent
    candidates = [
        Path(model_ref),
        ai_root / 'weights' / model_ref,
        ai_root / 'weights' / Path(model_ref).name,
        repo_root / model_ref,
        Path(settings.BASE_DIR) / model_ref,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return Path(model_ref)


def _detect_model_mode(model) -> str:
    """Prefer Cambodia custom names when present."""
    names = getattr(model, 'names', None) or {}
    name_values = {str(v).strip().lower() for v in names.values()} if isinstance(names, dict) else set()
    if {'bus', 'car', 'moto', 'truck', 'tuk tuk'} <= name_values or 'tuk tuk' in name_values or 'moto' in name_values:
        return 'cambodia'
    return 'coco'


def _get_vehicle_model():
    global _VEHICLE_MODEL, _VEHICLE_MODEL_MODE
    import threading

    if not hasattr(_get_vehicle_model, '_lock'):
        _get_vehicle_model._lock = threading.Lock()  # type: ignore[attr-defined]

    if _VEHICLE_MODEL is not None:
        return _VEHICLE_MODEL

    with _get_vehicle_model._lock:  # type: ignore[attr-defined]
        if _VEHICLE_MODEL is not None:
            return _VEHICLE_MODEL
        from ultralytics import YOLO

        path = _resolve_vehicle_model_path()
        if not path.is_file():
            logger.warning(
                'Vehicle YOLO weights not found at %s — skipping vehicle detection (no auto-download in production)',
                path,
            )
            return None
        try:
            _VEHICLE_MODEL = YOLO(str(path))
            _VEHICLE_MODEL_MODE = _detect_model_mode(_VEHICLE_MODEL)
            logger.info('Vehicle YOLO loaded: %s (mode=%s)', path, _VEHICLE_MODEL_MODE)
        except Exception:
            logger.exception('Failed to load vehicle YOLO: %s', path)
            return None
        return _VEHICLE_MODEL


def _class_map() -> dict[int, str]:
    if _VEHICLE_MODEL_MODE == 'cambodia':
        return CAMBODIA_VEHICLE_CLASSES
    return COCO_VEHICLE_CLASSES


def _normalize_bbox(xyxy, img_w: float, img_h: float) -> dict[str, float]:
    x1, y1, x2, y2 = (float(v) for v in xyxy)
    if img_w <= 0 or img_h <= 0:
        return {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
    return {
        'x1': round(x1 / img_w, 4),
        'y1': round(y1 / img_h, 4),
        'x2': round(x2 / img_w, 4),
        'y2': round(y2 / img_h, 4),
    }


def _bbox_area(bbox: dict) -> float:
    return max(0.0, float(bbox.get('x2', 0) - bbox.get('x1', 0))) * max(
        0.0, float(bbox.get('y2', 0) - bbox.get('y1', 0)),
    )


def _bbox_contains(outer: dict, inner: dict, pad: float = 0.02) -> bool:
    return (
        float(outer.get('x1', 0)) - pad <= float(inner.get('x1', 0))
        and float(outer.get('y1', 0)) - pad <= float(inner.get('y1', 0))
        and float(outer.get('x2', 1)) + pad >= float(inner.get('x2', 1))
        and float(outer.get('y2', 1)) + pad >= float(inner.get('y2', 1))
    )


def _is_degenerate_vehicle_box(bbox: dict) -> bool:
    """Reject thin edge/taillight fragments that are not a real vehicle face."""
    w = float(bbox.get('x2', 0) - bbox.get('x1', 0))
    h = float(bbox.get('y2', 0) - bbox.get('y1', 0))
    area = w * h
    if area < 0.04:
        return True
    if w < 0.12 or h < 0.15:
        return True
    ratio = w / h if h else 99
    # Tall thin strip on the side of the frame (classic false taillight box).
    if ratio < 0.45 and area < 0.18:
        return True
    return False


def vehicle_box_from_plate(plate_bbox: dict) -> dict:
    """
    When YOLO only catches a taillight but plate OCR has a solid plate box,
    synthesize a rear-vehicle box around the plate (close-up car photos).
    """
    px1 = float(plate_bbox['x1'])
    py1 = float(plate_bbox['y1'])
    px2 = float(plate_bbox['x2'])
    py2 = float(plate_bbox['y2'])
    pw = max(px2 - px1, 0.02)
    ph = max(py2 - py1, 0.01)
    # Plate sits on lower rear — expand sideways + upward to cover car body.
    x1 = max(0.0, px1 - pw * 1.8)
    x2 = min(1.0, px2 + pw * 1.8)
    y2 = min(1.0, py2 + ph * 2.2)
    y1 = max(0.0, py1 - ph * 8.5)
    # Ensure a reasonable car-sized box
    if (x2 - x1) < 0.35:
        cx = (x1 + x2) / 2
        x1 = max(0.0, cx - 0.28)
        x2 = min(1.0, cx + 0.28)
    if (y2 - y1) < 0.35:
        y1 = max(0.0, y2 - 0.55)
    return {
        'x1': round(x1, 4),
        'y1': round(y1, 4),
        'x2': round(x2, 4),
        'y2': round(y2, 4),
    }


def refine_vehicles_with_plate(
    vehicles: list[dict],
    plate_bbox: dict | None = None,
) -> list[dict]:
    """
    Prefer large vehicle boxes; drop taillight fragments; if plate is known and
    no vehicle covers it, invent a rear-car box from the plate.
    """
    usable = []
    for v in vehicles or []:
        bbox = v.get('bbox')
        if not isinstance(bbox, dict):
            continue
        item = dict(v)
        item['_area'] = _bbox_area(bbox)
        item['_degenerate'] = _is_degenerate_vehicle_box(bbox)
        usable.append(item)

    # Prefer non-degenerate, then larger area, then confidence
    usable.sort(
        key=lambda d: (
            0 if d['_degenerate'] else 1,
            d['_area'],
            float(d.get('confidence') or 0),
        ),
        reverse=True,
    )

    refined: list[dict] = []
    for item in usable:
        if item['_degenerate'] and refined:
            continue
        if item['_degenerate'] and plate_bbox and not _bbox_contains(item['bbox'], plate_bbox, pad=0.08):
            continue
        clean = {k: v for k, v in item.items() if not k.startswith('_')}
        refined.append(clean)
        if len(refined) >= 8:
            break

    if plate_bbox and isinstance(plate_bbox, dict):
        covered = any(_bbox_contains(v['bbox'], plate_bbox, pad=0.06) for v in refined if v.get('bbox'))
        if not covered:
            synth = {
                'vehicle_type': (refined[0]['vehicle_type'] if refined else 'car'),
                'label': (refined[0]['label'] if refined else 'Car'),
                'confidence': max(float(refined[0]['confidence']) if refined else 0.0, 55.0),
                'bbox': vehicle_box_from_plate(plate_bbox),
                'source': 'plate_expanded',
            }
            # Replace tiny wrong box with synthesized rear view
            if refined and refined[0].get('source') != 'plate_expanded' and _is_degenerate_vehicle_box(refined[0].get('bbox') or {}):
                refined[0] = synth
            elif not refined:
                refined = [synth]
            else:
                refined.insert(0, synth)

    return refined


def _build_detection(cls_idx: int, conf: float, xyxy, img_w: float, img_h: float) -> dict | None:
    vehicle_type = _class_map().get(int(cls_idx))
    if not vehicle_type:
        return None
    return {
        'vehicle_type': vehicle_type,
        'label': VEHICLE_TYPE_LABELS.get(vehicle_type, vehicle_type.title()),
        'confidence': round(float(conf) * 100, 1),
        'bbox': _normalize_bbox(xyxy, img_w, img_h),
    }


def detect_vehicles(image_path: str, *, imgsz: int | None = None) -> list[dict]:
    """
    Detect Cambodia road vehicles (Bus, Car, Moto, Truck, Tuk Tuk) or COCO fallback.
    Returns a list sorted by confidence (highest first).
    """
    if not vehicle_detection_enabled():
        return []

    path = Path(image_path)
    if not path.exists():
        logger.warning('Vehicle detection skipped — file not found: %s', image_path)
        return []

    try:
        model = _get_vehicle_model()
        if model is None:
            return []
        threshold = _confidence_threshold()
        class_ids = list(_class_map().keys())
        predict_kwargs = {
            'source': str(path),
            'conf': threshold,
            'verbose': False,
        }
        if imgsz:
            predict_kwargs['imgsz'] = int(imgsz)
        # Cambodia custom model: all classes are vehicles — do not filter COCO IDs
        if _VEHICLE_MODEL_MODE != 'cambodia':
            predict_kwargs['classes'] = class_ids

        results = model.predict(**predict_kwargs)
        if not results:
            return []

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return []

        img_h, img_w = (float(v) for v in result.orig_shape[:2])
        detections: list[dict] = []
        for box in boxes:
            cls_idx = int(box.cls.item())
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            item = _build_detection(cls_idx, conf, xyxy, img_w, img_h)
            if item:
                detections.append(item)

        detections.sort(key=lambda d: (_bbox_area(d['bbox']), d['confidence']), reverse=True)
        return detections
    except Exception:
        logger.exception('Vehicle detection failed for %s', image_path)
        return []
