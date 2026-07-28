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


_COCO_BACKUP_MODEL = None


def _get_coco_backup_model():
    """
    Generic COCO YOLO used as a *supplement* on crowded street scenes.

    The Cambodia model is precise on close-ups but misses small, distant
    motorcycles in dense traffic; COCO recovers them.
    """
    global _COCO_BACKUP_MODEL
    if _COCO_BACKUP_MODEL is not None:
        return _COCO_BACKUP_MODEL
    ai_root = _ai_root()
    for candidate in (
        ai_root / 'weights' / 'pretrained' / 'yolov8n.pt',
        ai_root / 'weights' / 'yolov8n.pt',
        Path(settings.BASE_DIR) / 'yolov8n.pt',
        Path('yolov8n.pt'),
    ):
        if not candidate.is_file():
            continue
        try:
            from ultralytics import YOLO
            _COCO_BACKUP_MODEL = YOLO(str(candidate))
            logger.info('COCO backup vehicle model loaded: %s', candidate)
            return _COCO_BACKUP_MODEL
        except Exception:
            logger.exception('Failed to load COCO backup model %s', candidate)
    return None


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


def _bbox_xyxy(bbox) -> tuple[float, float, float, float] | None:
    """Normalize bbox from list/tuple xyxy or dict {x1,y1,x2,y2}."""
    if bbox is None:
        return None
    if isinstance(bbox, dict):
        try:
            return (
                float(bbox.get('x1', 0)),
                float(bbox.get('y1', 0)),
                float(bbox.get('x2', 0)),
                float(bbox.get('y2', 0)),
            )
        except (TypeError, ValueError):
            return None
    try:
        vals = list(bbox)[:4]
        if len(vals) < 4:
            return None
        return tuple(float(v) for v in vals)  # type: ignore[return-value]
    except (TypeError, ValueError):
        return None


def _bbox_iou(a, b) -> float:
    """IoU for xyxy boxes (list or dict)."""
    aa = _bbox_xyxy(a)
    bb = _bbox_xyxy(b)
    if not aa or not bb:
        return 0.0
    ax1, ay1, ax2, ay2 = aa
    bx1, by1, bx2, by2 = bb
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _bbox_aspect(bbox) -> float:
    """width / height (motorcycle boxes are often taller / narrower)."""
    xy = _bbox_xyxy(bbox)
    if not xy:
        return 1.0
    x1, y1, x2, y2 = xy
    # Boxes may be normalized (0–1) or pixel coords — never clamp to 1.0 here,
    # or normalized boxes always report a square 1.0 aspect.
    w = max(1e-6, x2 - x1)
    h = max(1e-6, y2 - y1)
    return w / h


def _refine_vehicle_detections(detections: list[dict], *, strict: bool = False) -> list[dict]:
    """
    Fix common live/street false positives:
    - drop weak / degenerate car fragments
    - remap tiny tall tuk_tuk boxes that are really riders (not front-facing cars)
    - suppress overlapping duplicates (prefer higher confidence; large cars beat weak motos)
    """
    if not detections:
        return []

    car_min = 62.0 if strict else 55.0
    cleaned: list[dict] = []
    for d in detections:
        vtype = d.get('vehicle_type') or ''
        conf = float(d.get('confidence') or 0)
        bbox = d.get('bbox') or {}
        aspect = _bbox_aspect(bbox)
        area = _bbox_area(bbox) if isinstance(bbox, dict) else 0.0

        # Front-facing cars are naturally tall (aspect often 0.3–0.7) — NEVER
        # reclassify Car → Motorcycle from aspect alone. That caused SUVs labeled
        # "Motorcycle 0.73" on Phnom Penh street video.
        if vtype == 'car':
            if conf < car_min:
                continue
            # Tiny thin strip only (taillight / fragment), not a vehicle face.
            if area < 0.03 and aspect < 0.4:
                continue

        # Real tuk-tuks are wider / cabin-shaped. A large tall box is almost always
        # a front-facing car/SUV that the Cambodia model mislabeled as Tuk Tuk.
        if vtype == 'tuk_tuk' and area >= 0.10 and aspect < 0.55:
            d = {
                **d,
                'vehicle_type': 'car',
                'label': VEHICLE_TYPE_LABELS.get('car', 'Car'),
            }
            vtype = 'car'
        # Tiny tall tuk_tuk → rider.
        elif vtype == 'tuk_tuk' and area < 0.08 and aspect < 0.55 and conf < 75.0:
            d = {
                **d,
                'vehicle_type': 'motorcycle',
                'label': VEHICLE_TYPE_LABELS.get('motorcycle', 'Motorcycle'),
            }
            vtype = 'motorcycle'

        # Drop tiny / ultra-thin motorcycle fragments that are just noise.
        if vtype == 'motorcycle' and (area < 0.012 or aspect < 0.15) and conf < 70.0:
            continue

        cleaned.append(d)

    # Suppress overlaps: higher confidence wins. Large cars beat weak overlapping motos.
    keep = [True] * len(cleaned)
    for i, a in enumerate(cleaned):
        if not keep[i]:
            continue
        for j, b in enumerate(cleaned):
            if i >= j or not keep[j]:
                continue
            iou = _bbox_iou(a.get('bbox') or {}, b.get('bbox') or {})
            if iou < 0.35:
                continue
            ta, tb = a.get('vehicle_type'), b.get('vehicle_type')
            ca, cb = float(a.get('confidence') or 0), float(b.get('confidence') or 0)
            aa, ab = _bbox_area(a.get('bbox') or {}), _bbox_area(b.get('bbox') or {})

            if ta == tb:
                if ca >= cb:
                    keep[j] = False
                else:
                    keep[i] = False
                continue

            # Overlapping car + motorcycle: keep BOTH when the moto is nested
            # inside a larger car face; otherwise keep the larger / stronger box.
            if {ta, tb} == {'car', 'motorcycle'}:
                car, moto = (a, b) if ta == 'car' else (b, a)
                car_i, moto_i = (i, j) if ta == 'car' else (j, i)
                car_area = _bbox_area(car.get('bbox') or {})
                moto_area = _bbox_area(moto.get('bbox') or {})
                car_conf = float(car.get('confidence') or 0)
                moto_conf = float(moto.get('confidence') or 0)
                if moto_area <= car_area * 0.65 and moto_conf >= 40:
                    # Nested rider — keep both.
                    continue
                if car_area >= moto_area * 1.2 or (car_conf >= moto_conf and car_area >= 0.08):
                    keep[moto_i] = False
                elif moto_conf >= car_conf + 8 and moto_area < car_area * 0.7:
                    keep[car_i] = False
                elif ca >= cb:
                    keep[j] = False
                else:
                    keep[i] = False
                continue

            if ca >= cb:
                keep[j] = False
            else:
                keep[i] = False

    return [d for d, k in zip(cleaned, keep) if k]


def _coco_supplement_floor() -> int:
    """Below this many Cambodia-model boxes, run the COCO supplement pass."""
    return int(getattr(settings, 'AI_VEHICLE_COCO_SUPPLEMENT_FLOOR', 4))


def _detect_with_coco_backup(
    path: Path,
    *,
    imgsz: int | None,
    threshold: float,
    existing: list[dict],
) -> list[dict]:
    """Return COCO vehicle boxes that do not already overlap a Cambodia box."""
    if not getattr(settings, 'AI_VEHICLE_COCO_SUPPLEMENT', True):
        return []
    # Cambodia already found enough vehicles — skip COCO (avoids car↔moto noise).
    if len(existing) >= _coco_supplement_floor():
        return []
    model = _get_coco_backup_model()
    if model is None:
        return []
    try:
        kwargs = {
            'source': str(path),
            # Small distant riders need a lower floor than close-up plates.
            'conf': min(float(threshold), 0.35),
            'iou': 0.5,
            'max_det': 40,
            'classes': list(COCO_VEHICLE_CLASSES.keys()),
            'verbose': False,
        }
        # Higher resolution recovers small motorcycles on 360p street footage.
        kwargs['imgsz'] = int(imgsz) if imgsz else 960
        results = model.predict(**kwargs)
    except Exception:
        logger.exception('COCO supplement detection failed for %s', path)
        return []
    if not results:
        return []
    result = results[0]
    boxes = getattr(result, 'boxes', None)
    if boxes is None or len(boxes) == 0:
        return []
    img_h, img_w = (float(v) for v in result.orig_shape[:2])
    extras: list[dict] = []
    for box in boxes:
        cls_idx = int(box.cls.item())
        vehicle_type = COCO_VEHICLE_CLASSES.get(cls_idx)
        if not vehicle_type:
            continue
        bbox = _normalize_bbox(box.xyxy[0].tolist(), img_w, img_h)
        area = _bbox_area(bbox)
        conf_pct = round(float(box.conf.item()) * 100, 1)
        # Skip anything already covered by the primary model or a prior extra.
        # Motorcycles may sit inside a larger car box — still keep them if much smaller.
        blocked = False
        for d in (*existing, *extras):
            iou = _bbox_iou(bbox, d.get('bbox') or {})
            if iou < 0.35:
                continue
            other_area = _bbox_area(d.get('bbox') or {})
            other_type = d.get('vehicle_type') or ''
            if vehicle_type == 'motorcycle' and other_type in ('car', 'tuk_tuk', 'truck', 'bus'):
                # Rider nested in a larger vehicle face — keep the motorcycle.
                if area <= other_area * 0.65 and conf_pct >= 40:
                    continue
            blocked = True
            break
        if blocked:
            continue
        # Ignore tiny COCO car/truck scraps; keep motorcycles even if smaller.
        if vehicle_type != 'motorcycle' and area < 0.04:
            continue
        if vehicle_type == 'motorcycle' and area < 0.015 and conf_pct < 45:
            continue
        extras.append({
            'vehicle_type': vehicle_type,
            'label': VEHICLE_TYPE_LABELS.get(vehicle_type, vehicle_type.title()),
            'confidence': conf_pct,
            'bbox': bbox,
            'source': 'coco',
        })
    return extras


def detect_vehicles(image_path: str, *, imgsz: int | None = None, fast_mode: bool = False) -> list[dict]:
    """
    Detect Cambodia road vehicles (Bus, Car, Moto, Truck, Tuk Tuk) or COCO fallback.
    Returns a list sorted by confidence (highest first).
    
    Args:
        image_path: Path to image file
        imgsz: YOLO image size (None = auto)
        fast_mode: Enable fast inference optimizations
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
        # Live/HTTP feeds: higher floor reduces motorcycle→car false labels.
        threshold = 0.48 if fast_mode else _confidence_threshold()
        class_ids = list(_class_map().keys())
        predict_kwargs = {
            'source': str(path),
            'conf': threshold,
            'iou': 0.5,  # Balanced NMS → removes duplicates but keeps separate vehicles
            'max_det': 40 if fast_mode else 100,
            # Class-aware NMS keeps car+moto on same object — we refine after.
            'agnostic_nms': False,
            'verbose': False,
        }
        if imgsz:
            predict_kwargs['imgsz'] = int(imgsz)
        # Cambodia custom model: all classes are vehicles — do not filter COCO IDs
        if _VEHICLE_MODEL_MODE != 'cambodia':
            predict_kwargs['classes'] = class_ids

        results = model.predict(**predict_kwargs)
        result = results[0] if results else None
        boxes = getattr(result, 'boxes', None) if result is not None else None

        detections: list[dict] = []
        img_h = img_w = 0.0
        if result is not None:
            img_h, img_w = (float(v) for v in result.orig_shape[:2])
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls_idx = int(box.cls.item())
                conf = float(box.conf.item())
                xyxy = box.xyxy[0].tolist()
                item = _build_detection(cls_idx, conf, xyxy, img_w, img_h)
                if item:
                    detections.append(item)

        # Crowded street scenes: Cambodia weights miss small/distant riders.
        # Supplement with COCO so every visible vehicle gets a box.
        if len(detections) < _coco_supplement_floor():
            detections.extend(
                _detect_with_coco_backup(
                    path,
                    imgsz=imgsz,
                    threshold=threshold,
                    existing=detections,
                )
            )

        if not detections:
            return []

        detections = _refine_vehicle_detections(detections, strict=fast_mode)
        detections.sort(key=lambda d: (_bbox_area(d['bbox']), d['confidence']), reverse=True)
        return detections
    except Exception:
        logger.exception('Vehicle detection failed for %s', image_path)
        return []
