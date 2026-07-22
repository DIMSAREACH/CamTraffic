"""OCR engine for Cambodian / Latin license plates (EasyOCR)."""

from __future__ import annotations

import logging
import re
from typing import Any

import cv2
import numpy as np

from config import Settings, get_settings

logger = logging.getLogger(__name__)

_READER: Any = None

# Cambodia plate patterns (simplified): 1-3A-1234, 2AB-1234, etc.
_PLATE_RE = re.compile(
    r"^[0-9]{1,2}[A-Z]{1,3}[- ]?[0-9]{3,4}$",
    re.IGNORECASE,
)


def _get_reader(settings: Settings):
    global _READER
    if _READER is not None:
        return _READER
    try:
        import easyocr

        langs = [x.strip() for x in settings.ai_ocr_languages.split(",") if x.strip()]
        _READER = easyocr.Reader(langs or ["en"], gpu=False)
        logger.info("EasyOCR reader initialized (%s)", langs)
        return _READER
    except Exception as exc:  # pragma: no cover
        logger.warning("EasyOCR unavailable: %s", exc)
        return None


def preprocess_plate(crop: np.ndarray) -> np.ndarray:
    """Enhance plate crop for OCR."""
    if crop is None or crop.size == 0:
        return crop
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    gray = cv2.bilateralFilter(gray, 7, 50, 50)
    gray = cv2.equalizeHist(gray)
    # Upscale small plates
    h, w = gray.shape[:2]
    if h < 40 or w < 120:
        gray = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
    return gray


def normalize_plate_text(text: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", text.upper())
    # Insert dash for common KH patterns: 2A1234 → 2A-1234
    m = re.match(r"^([0-9]{1,2}[A-Z]{1,3})([0-9]{3,4})$", cleaned)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return cleaned


def format_valid(text: str) -> bool:
    return bool(_PLATE_RE.match(text.replace(" ", "")))


def read_plate(
    crop: np.ndarray,
    *,
    settings: Settings | None = None,
) -> dict:
    """
    Run OCR on a plate crop.

    Returns dict: text, confidence, format_valid, raw_text
    """
    settings = settings or get_settings()

    if settings.ai_mock_mode or not settings.ai_ocr_enabled:
        return {
            "text": "2A-1234",
            "confidence": 0.86,
            "format_valid": True,
            "raw_text": "2A-1234",
            "engine": "mock",
        }

    reader = _get_reader(settings)
    if reader is None:
        return {
            "text": "",
            "confidence": 0.0,
            "format_valid": False,
            "raw_text": "",
            "engine": "unavailable",
        }

    processed = preprocess_plate(crop)
    try:
        results = reader.readtext(processed)
    except Exception as exc:
        logger.warning("OCR failed: %s", exc)
        return {
            "text": "",
            "confidence": 0.0,
            "format_valid": False,
            "raw_text": "",
            "engine": "easyocr_error",
        }

    if not results:
        return {
            "text": "",
            "confidence": 0.0,
            "format_valid": False,
            "raw_text": "",
            "engine": "easyocr",
        }

    # Pick highest confidence fragment, then join nearby text
    best = max(results, key=lambda r: float(r[2]))
    raw = " ".join(str(r[1]) for r in results)
    text = normalize_plate_text(str(best[1]))
    conf = round(float(best[2]), 4)
    return {
        "text": text,
        "confidence": conf,
        "format_valid": format_valid(text),
        "raw_text": raw,
        "engine": "easyocr",
    }


def read_plates_from_regions(
    image: np.ndarray,
    plate_regions: list[dict],
    *,
    settings: Settings | None = None,
) -> list[dict]:
    from plate_detector import crop_plate

    settings = settings or get_settings()
    out: list[dict] = []
    for region in plate_regions:
        bbox = region.get("bbox") or []
        if len(bbox) != 4:
            continue
        crop = crop_plate(image, bbox)
        ocr = read_plate(crop, settings=settings)
        out.append(
            {
                **ocr,
                "bbox": bbox,
                "detection_confidence": region.get("confidence"),
                "source": region.get("source"),
            }
        )
    return out
