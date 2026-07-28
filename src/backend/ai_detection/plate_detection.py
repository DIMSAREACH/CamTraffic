"""
Cambodia license-plate region detector (YOLOv8).

Detects plate bounding boxes; EasyOCR then reads characters from crops.
Trained on converted License Plate.v3 (single class: license_plate).
"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

_PLATE_MODEL = None


def plate_detect_enabled() -> bool:
    if not getattr(settings, 'AI_PLATE_DETECT_ENABLED', True):
        return False
    return True


def _plate_model_path() -> str:
    return getattr(settings, 'AI_PLATE_DETECT_MODEL', 'best_cambodia_plates.pt')


def _confidence() -> float:
    return float(getattr(settings, 'AI_PLATE_DETECT_CONFIDENCE', 0.30))


def _ai_root() -> Path:
    return Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))


def _resolve_model_path() -> Path:
    ref = _plate_model_path()
    ai_root = _ai_root()
    candidates = [
        Path(ref),
        ai_root / 'weights' / ref,
        ai_root / 'weights' / Path(ref).name,
        Path(settings.BASE_DIR) / ref,
    ]
    for c in candidates:
        if c.is_file():
            return c
    return Path(ref)


def _get_model():
    global _PLATE_MODEL
    import threading

    if not hasattr(_get_model, '_lock'):
        _get_model._lock = threading.Lock()  # type: ignore[attr-defined]

    if _PLATE_MODEL is not None:
        return _PLATE_MODEL

    with _get_model._lock:  # type: ignore[attr-defined]
        if _PLATE_MODEL is not None:
            return _PLATE_MODEL
        path = _resolve_model_path()
        if not path.is_file():
            logger.info('Plate detector weights not found at %s — OCR will use vehicle/heuristic crops', path)
            return None
        try:
            from ultralytics import YOLO
            _PLATE_MODEL = YOLO(str(path))
            logger.info('Plate detector loaded: %s', path)
        except Exception:
            logger.exception('Failed to load plate detector: %s', path)
            return None
        return _PLATE_MODEL


def detect_plate_boxes(image_path: str | Path) -> list[dict]:
    """
    Return plate boxes sorted by confidence.
    Each item: {confidence, bbox: {x1,y1,x2,y2} normalized, xyxy_px: [x1,y1,x2,y2]}
    """
    if not plate_detect_enabled():
        return []
    path = Path(image_path)
    if not path.is_file():
        return []
    model = _get_model()
    if model is None:
        return []
    try:
        results = model.predict(source=str(path), conf=_confidence(), iou=0.7, verbose=False)
        if not results:
            return []
        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return []
        img_h, img_w = (float(v) for v in result.orig_shape[:2])
        out: list[dict] = []
        for box in boxes:
            conf = float(box.conf.item())
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            out.append({
                'confidence': round(conf * 100, 1),
                'bbox': {
                    'x1': round(x1 / img_w, 4),
                    'y1': round(y1 / img_h, 4),
                    'x2': round(x2 / img_w, 4),
                    'y2': round(y2 / img_h, 4),
                },
                'xyxy_px': [int(x1), int(y1), int(x2), int(y2)],
            })
        # Drop giant false positives (lanterns / signs) — real plates are small strips
        filtered: list[dict] = []
        for det in out:
            bb = det['bbox']
            bw = float(bb['x2']) - float(bb['x1'])
            bh = float(bb['y2']) - float(bb['y1'])
            area = bw * bh
            if area > 0.10 or bh > 0.22 or bw > 0.50:
                continue
            if area < 0.0003:
                continue
            # Plates are typically wider than tall (allow near-square moto plates)
            if bh > 0 and (bw / bh) < 0.95:
                continue
            filtered.append(det)
        filtered.sort(key=lambda d: d['confidence'], reverse=True)
        return filtered
    except Exception:
        logger.exception('Plate detection failed for %s', image_path)
        return []


def detect_plate_boxes_near_vehicles(
    image_path: str | Path,
    vehicles: list[dict] | None = None,
    *,
    max_vehicles: int = 8,
) -> list[dict]:
    """
    Run plate YOLO inside vehicle crops (street / video scenes).

    Full-frame plate YOLO often false-fires on distant traffic (huge boxes).
    Cropping to each vehicle recovers real plate regions and maps them back
    to full-image normalized coordinates.
    """
    if not plate_detect_enabled():
        return []
    path = Path(image_path)
    if not path.is_file():
        return []
    model = _get_model()
    if model is None:
        return []

    image = cv2.imread(str(path))
    if image is None:
        return []
    img_h, img_w = image.shape[:2]
    vehicles = list(vehicles or [])
    vehicles.sort(key=lambda v: float(v.get('confidence') or 0), reverse=True)

    # Fallback: full-frame filtered detections
    full = detect_plate_boxes(path)
    if not vehicles:
        return full

    import tempfile

    found: list[dict] = []
    for idx, vehicle in enumerate(vehicles[:max_vehicles]):
        bb = vehicle.get('bbox') or {}
        try:
            vx1 = int(float(bb.get('x1', 0)) * img_w)
            vy1 = int(float(bb.get('y1', 0)) * img_h)
            vx2 = int(float(bb.get('x2', 1)) * img_w)
            vy2 = int(float(bb.get('y2', 1)) * img_h)
        except (TypeError, ValueError):
            continue
        vh = max(vy2 - vy1, 1)
        vw = max(vx2 - vx1, 1)
        # Plate usually on lower half of the vehicle
        cy1 = max(0, vy1 + int(vh * 0.45))
        cy2 = min(img_h, vy2 + int(vh * 0.05))
        cx1 = max(0, vx1 - int(vw * 0.05))
        cx2 = min(img_w, vx2 + int(vw * 0.05))
        if cy2 - cy1 < 16 or cx2 - cx1 < 24:
            continue
        crop = image[cy1:cy2, cx1:cx2]
        if crop.size == 0:
            continue
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp_path = tmp.name
        tmp.close()
        try:
            if not cv2.imwrite(tmp_path, crop):
                continue
            # Slightly lower conf inside crop — moto plates are often ~0.10–0.25.
            results = model.predict(
                source=tmp_path,
                conf=max(0.08, _confidence() * 0.45),
                iou=0.7,
                verbose=False,
            )
            if not results or results[0].boxes is None:
                continue
            ch, cw = float(crop.shape[0]), float(crop.shape[1])
            for box in results[0].boxes:
                conf = float(box.conf.item())
                x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
                # Map crop pixels → full image normalized
                fx1 = (cx1 + x1) / img_w
                fy1 = (cy1 + y1) / img_h
                fx2 = (cx1 + x2) / img_w
                fy2 = (cy1 + y2) / img_h
                bw = fx2 - fx1
                bh = fy2 - fy1
                area = bw * bh
                if area <= 0 or area > 0.12 or bh > 0.25 or bw > 0.55:
                    continue
                if bh > 0 and (bw / bh) < 0.95:
                    continue
                found.append({
                    'confidence': round(conf * 100, 1),
                    'bbox': {
                        'x1': round(max(0.0, fx1), 4),
                        'y1': round(max(0.0, fy1), 4),
                        'x2': round(min(1.0, fx2), 4),
                        'y2': round(min(1.0, fy2), 4),
                    },
                    'xyxy_px': [
                        int(cx1 + x1), int(cy1 + y1),
                        int(cx1 + x2), int(cy1 + y2),
                    ],
                    'source': f'vehicle_{idx}',
                })
        except Exception:
            logger.exception('Plate-in-vehicle detect failed for vehicle %s', idx)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    # Merge with any valid full-frame hits; de-dupe by IoU-ish center proximity
    merged = found + full
    merged.sort(key=lambda d: d['confidence'], reverse=True)
    kept: list[dict] = []
    for det in merged:
        bb = det['bbox']
        cx = (bb['x1'] + bb['x2']) / 2
        cy = (bb['y1'] + bb['y2']) / 2
        if any(
            abs(cx - (k['bbox']['x1'] + k['bbox']['x2']) / 2) < 0.04
            and abs(cy - (k['bbox']['y1'] + k['bbox']['y2']) / 2) < 0.04
            for k in kept
        ):
            continue
        kept.append(det)
        if len(kept) >= 6:
            break
    return kept


def crop_plates_from_image(image: np.ndarray, detections: list[dict], pad: float = 0.04) -> list[tuple[np.ndarray, str]]:
    """Crop plate regions from BGR image using detector boxes (with light padding)."""
    h, w = image.shape[:2]
    crops: list[tuple[np.ndarray, str]] = []
    for idx, det in enumerate(detections):
        xyxy = det.get('xyxy_px')
        if xyxy and len(xyxy) == 4:
            x1, y1, x2, y2 = xyxy
        else:
            bb = det.get('bbox') or {}
            x1 = int(float(bb.get('x1', 0)) * w)
            y1 = int(float(bb.get('y1', 0)) * h)
            x2 = int(float(bb.get('x2', 1)) * w)
            y2 = int(float(bb.get('y2', 1)) * h)
        bw, bh = max(x2 - x1, 1), max(y2 - y1, 1)
        px, py = int(bw * pad), int(bh * pad)
        # Cambodia plates: Khmer province on TOP, English province on BOTTOM.
        # Expand both directions so the printed city/province lines stay in the crop.
        x1 = max(0, x1 - px)
        y1 = max(0, y1 - max(int(py * 2.4), int(bh * 0.9)))
        x2 = min(w, x2 + px)
        y2 = min(h, y2 + max(int(py * 2.4), int(bh * 0.9)))
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 20:
            continue
        conf = det.get('confidence', 0)
        crops.append((crop, f'yolo_plate_{idx}_c{conf}'))
    return crops


def detect_and_crop_plates(image_path: str | Path) -> list[tuple[np.ndarray, str]]:
    """Load image, run plate YOLO, return OCR-ready crops."""
    path = Path(image_path)
    image = cv2.imread(str(path))
    if image is None:
        return []
    dets = detect_plate_boxes(path)
    if not dets:
        return []
    return crop_plates_from_image(image, dets)
