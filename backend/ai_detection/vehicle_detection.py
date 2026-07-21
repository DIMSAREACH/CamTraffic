"""
Vehicle detection using YOLOv8 COCO pretrained weights.
Runs on the full uploaded frame (not the sign center-crop).
"""
import logging
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

# COCO class index → CamTraffic vehicle_type
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
}

_VEHICLE_MODEL = None


def vehicle_detection_enabled() -> bool:
    return getattr(settings, 'AI_VEHICLE_ENABLED', True)


def _vehicle_model_path() -> str:
    return getattr(settings, 'AI_VEHICLE_MODEL', 'yolov8n.pt')


def _confidence_threshold() -> float:
    return float(getattr(settings, 'AI_VEHICLE_CONFIDENCE_THRESHOLD', 0.35))


def _resolve_vehicle_model_path() -> Path:
    model_ref = _vehicle_model_path()
    project_root = Path(settings.BASE_DIR).parent
    candidates = [
        Path(model_ref),
        project_root / model_ref,
        project_root / 'ai' / 'weights' / model_ref,
        Path(settings.BASE_DIR) / model_ref,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return Path(model_ref)


def _get_vehicle_model():
    global _VEHICLE_MODEL
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
    except Exception:
        logger.exception('Failed to load vehicle YOLO: %s', path)
        return None
    return _VEHICLE_MODEL


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


def _build_detection(cls_idx: int, conf: float, xyxy, img_w: float, img_h: float) -> dict | None:
    vehicle_type = COCO_VEHICLE_CLASSES.get(int(cls_idx))
    if not vehicle_type:
        return None
    return {
        'vehicle_type': vehicle_type,
        'label': VEHICLE_TYPE_LABELS.get(vehicle_type, vehicle_type.title()),
        'confidence': round(float(conf) * 100, 1),
        'bbox': _normalize_bbox(xyxy, img_w, img_h),
    }


def detect_vehicles(image_path: str) -> list[dict]:
    """
    Detect cars, motorcycles, buses, and trucks in an image.
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
        results = model.predict(
            source=str(path),
            conf=threshold,
            verbose=False,
            classes=list(COCO_VEHICLE_CLASSES.keys()),
        )
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

        detections.sort(key=lambda d: d['confidence'], reverse=True)
        return detections
    except Exception:
        logger.exception('Vehicle detection failed for %s', image_path)
        return []
