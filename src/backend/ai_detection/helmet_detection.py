"""
Motorcycle helmet / no-helmet detection for CamTraffic.

Supports 2-class (helmet, no_helmet) and legacy 3-class (helmet, no_helmet, head)
Cambodia weights. Only **no_helmet** is a hard violation; bare **head** is a
violation only when no helmet box overlaps the same rider.
"""
from __future__ import annotations

import logging
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

HELMET_CLASS_NAMES: dict[int, str] = {
    0: 'helmet',
    1: 'no_helmet',
    2: 'head',
}

_HELMET_MODEL = None
_HELMET_MODEL_PATH: str | None = None


def helmet_detection_enabled() -> bool:
    return getattr(settings, 'AI_HELMET_ENABLED', True)


def reset_helmet_model_cache() -> None:
    """Force next call to reload weights (after retrain)."""
    global _HELMET_MODEL, _HELMET_MODEL_PATH
    _HELMET_MODEL = None
    _HELMET_MODEL_PATH = None


def _ai_root() -> Path:
    return Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))


def _helmet_model_path() -> Path:
    model_ref = getattr(settings, 'AI_HELMET_MODEL', 'best_cambodia_helmet.pt')
    ai_root = _ai_root()
    candidates = [
        Path(model_ref),
        ai_root / 'weights' / model_ref,
        ai_root / 'weights' / Path(model_ref).name,
        Path(settings.BASE_DIR) / model_ref,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return Path(model_ref)


def _confidence_threshold() -> float:
    return float(getattr(settings, 'AI_HELMET_CONFIDENCE_THRESHOLD', 0.40))


def _get_helmet_model():
    global _HELMET_MODEL, _HELMET_MODEL_PATH
    path = _helmet_model_path()
    path_key = str(path.resolve()) if path.is_file() else str(path)
    if _HELMET_MODEL is not None and _HELMET_MODEL_PATH == path_key:
        return _HELMET_MODEL
    if not path.is_file():
        logger.warning('Helmet model not found at %s — helmet detect disabled', path)
        _HELMET_MODEL = None
        _HELMET_MODEL_PATH = None
        return None
    try:
        from ultralytics import YOLO
        _HELMET_MODEL = YOLO(str(path))
        _HELMET_MODEL_PATH = path_key
        logger.info('Loaded helmet model: %s names=%s', path, getattr(_HELMET_MODEL, 'names', None))
        return _HELMET_MODEL
    except Exception:
        logger.exception('Failed to load helmet model from %s', path)
        return None


def _map_class(class_id: int, names: dict | list | None) -> str:
    raw = ''
    if isinstance(names, dict) and class_id in names:
        raw = str(names[class_id])
    elif isinstance(names, (list, tuple)) and 0 <= class_id < len(names):
        raw = str(names[class_id])
    else:
        raw = HELMET_CLASS_NAMES.get(class_id, f'class_{class_id}')
    key = raw.strip().lower().replace('-', '_').replace(' ', '_')
    if key in ('without_helmet', 'no_helmet', 'not_wearing_helmet', 'bare_head', 'nohelmet'):
        return 'no_helmet'
    if key in ('with_helmet', 'wearing_helmet', 'helmet'):
        return 'helmet'
    if key in ('head', 'person_head', 'rider_head'):
        return 'head'
    return key


def _bbox_iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = float(a['x1']), float(a['y1']), float(a['x2']), float(a['y2'])
    bx1, by1, bx2, by2 = float(b['x1']), float(b['y1']), float(b['x2']), float(b['y2'])
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


def _refine_helmet_detections(detections: list[dict]) -> list[dict]:
    """
    Clean helmet outputs:
    - NMS within the same class
    - Drop head when a helmet overlaps (rider is wearing a helmet)
    - Prefer no_helmet over overlapping head
    - Only no_helmet (and uncovered head) count as violations
    """
    if not detections:
        return []

    # Class priority for display / NMS winners
    rank = {'no_helmet': 0, 'helmet': 1, 'head': 2}
    ordered = sorted(
        detections,
        key=lambda d: (rank.get(d['class_key'], 9), -float(d.get('confidence') or 0)),
    )

    kept: list[dict] = []
    for cand in ordered:
        bb = cand.get('bbox') or {}
        drop = False
        for prev in kept:
            iou = _bbox_iou(bb, prev.get('bbox') or {})
            if iou < 0.35:
                continue
            pk, ck = prev.get('class_key'), cand.get('class_key')
            # Same class → keep higher confidence (already ordered)
            if pk == ck:
                drop = True
                break
            # Helmet covers this head → not a violation
            if ck == 'head' and pk == 'helmet':
                drop = True
                break
            # no_helmet already claimed this rider → drop weaker head
            if ck == 'head' and pk == 'no_helmet':
                drop = True
                break
            # Helmet vs no_helmet on same spot: keep higher conf (ordered)
            if {pk, ck} == {'helmet', 'no_helmet'}:
                drop = True
                break
        if not drop:
            kept.append(cand)

    # Finalize violation flags after suppression
    out: list[dict] = []
    for d in kept:
        key = d.get('class_key') or ''
        if key == 'no_helmet':
            is_violation = True
            label = 'No Helmet'
        elif key == 'head':
            # Bare head with no overlapping helmet left → treat as no-helmet
            is_violation = True
            label = 'No Helmet'
            d = {**d, 'class_key': 'no_helmet'}
        else:
            is_violation = False
            label = 'Helmet'
        out.append({**d, 'label': label, 'is_violation': is_violation})

    out.sort(key=lambda d: (0 if d.get('is_violation') else 1, -float(d.get('confidence') or 0)))
    return out


def detect_helmets(
    image_path: str,
    *,
    imgsz: int | None = None,
    fast_mode: bool = False,
) -> list[dict]:
    """
    Detect helmet / no_helmet regions.

    Returns list of:
      { class_key, label, confidence, bbox: {x1,y1,x2,y2} normalized, is_violation }
    """
    if not helmet_detection_enabled():
        return []

    model = _get_helmet_model()
    if model is None:
        return []

    conf = _confidence_threshold()
    # Live webcam: slightly lower floor for small distant riders.
    if fast_mode:
        conf = min(conf, float(getattr(settings, 'AI_HELMET_LIVE_CONFIDENCE', 0.32)))
    size = imgsz or int(
        getattr(
            settings,
            'AI_LIVE_IMGSZ' if fast_mode else 'AI_IMGSZ',
            512,
        )
    )
    # Helmet heads are small — never go below 416 even in live mode.
    size = max(int(size), 416)

    try:
        results = model.predict(
            source=str(image_path),
            conf=conf,
            imgsz=size,
            iou=0.55,
            verbose=False,
        )
    except Exception:
        logger.exception('Helmet prediction failed for %s', image_path)
        return []

    if not results:
        return []

    result = results[0]
    names = getattr(result, 'names', None) or getattr(model, 'names', None) or HELMET_CLASS_NAMES
    boxes = getattr(result, 'boxes', None)
    if boxes is None or len(boxes) == 0:
        return []

    try:
        import cv2
        img = cv2.imread(str(image_path))
        h, w = (img.shape[0], img.shape[1]) if img is not None else (1, 1)
    except Exception:
        h, w = 1, 1

    detections: list[dict] = []
    for box in boxes:
        try:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = [float(v) for v in xyxy]
            bw = (x2 - x1) / max(w, 1)
            bh = (y2 - y1) / max(h, 1)
            # Reject absurd full-frame / tiny noise boxes
            if bw * bh < 0.0003 or bw * bh > 0.35:
                continue
            class_key = _map_class(cls_id, names)
            if class_key not in ('helmet', 'no_helmet', 'head'):
                continue
            detections.append({
                'class_key': class_key,
                'label': class_key,
                'confidence': round(confidence, 4),
                'bbox': {
                    'x1': round(x1 / max(w, 1), 6),
                    'y1': round(y1 / max(h, 1), 6),
                    'x2': round(x2 / max(w, 1), 6),
                    'y2': round(y2 / max(h, 1), 6),
                },
                'is_violation': class_key in ('no_helmet', 'head'),
            })
        except Exception:
            logger.exception('Failed to parse helmet box')
            continue

    return _refine_helmet_detections(detections)


def summarize_helmet_violations(detections: list[dict]) -> dict:
    no_helmet = [d for d in detections if d.get('class_key') == 'no_helmet' or d.get('is_violation')]
    helmets = [d for d in detections if d.get('class_key') == 'helmet']
    return {
        'helmet_count': len(helmets),
        'no_helmet_count': len(no_helmet),
        'head_count': 0,
        'violation_count': len(no_helmet),
        'has_no_helmet_violation': len(no_helmet) > 0,
        'detections': detections,
    }
