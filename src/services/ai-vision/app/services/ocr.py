"""License plate OCR using EasyOCR with graceful fallback."""

from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2
import numpy as np

from app.config import settings
from app.schemas import PlateDetection, VehicleDetection
from app.services.ocr_client import ocr_service_enabled

logger = logging.getLogger(__name__)

_READER = None
PLATE_PATTERN = re.compile(r"^[A-Z0-9]{1,3}[- ]?[A-Z0-9]{1,6}$", re.I)


def _get_reader():
    global _READER
    if _READER is not None:
        return _READER
    if not settings.ai_ocr_enabled:
        return None
    try:
        import easyocr

        _READER = easyocr.Reader(["en"], gpu=False, verbose=False)
        return _READER
    except Exception as exc:
        logger.warning("EasyOCR unavailable: %s", exc)
        return None


def _crop_vehicle(image_path: Path, bbox: list[float]) -> np.ndarray | None:
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return None
    return img[y1:y2, x1:x2]


def _ocr_crop(crop: np.ndarray) -> tuple[str, float]:
    reader = _get_reader()
    if reader is None:
        return "", 0.0
    try:
        results = reader.readtext(crop, detail=1, paragraph=False)
        if not results:
            return "", 0.0
        best = max(results, key=lambda r: r[2])
        text = re.sub(r"\s+", "", best[1].upper())
        return text, float(best[2])
    except Exception as exc:
        logger.debug("OCR read failed: %s", exc)
        return "", 0.0


def recognize_plates_for_vehicles(
    image_path: Path,
    vehicles: list[VehicleDetection],
) -> list[PlateDetection]:
    if settings.ai_ocr_enabled and ocr_service_enabled():
        try:
            from app.services.ocr_client import map_remote_to_plates, read_frame_via_ocr_service

            data = read_frame_via_ocr_service(image_path, vehicles)
            if data:
                return map_remote_to_plates(data, vehicles)
        except Exception as exc:
            logger.warning("ocr-service unavailable (%s); using embedded OCR", exc)

    plates: list[PlateDetection] = []
    for vehicle in vehicles[:3]:
        crop = _crop_vehicle(image_path, vehicle.bbox)
        if crop is None:
            continue
        text, conf = _ocr_crop(crop)
        if not text or conf < 0.3:
            continue
        plates.append(
            PlateDetection(
                text=text,
                confidence=round(conf, 4),
                bbox=vehicle.bbox,
                format_valid=bool(PLATE_PATTERN.match(text)),
            )
        )
    return plates
