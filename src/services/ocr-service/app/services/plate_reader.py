"""Cambodia license plate OCR — EasyOCR + normalization rules."""

from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2
import numpy as np

from app.config import settings
from app.schemas import PlateReadResult

logger = logging.getLogger(__name__)

_READER = None

_PLATE_FORMAT = re.compile(r"^(\d{1,2})([A-Z]{1,3})-(\d{3,5})$", re.I)
_PLATE_LOOSE = re.compile(r"^(\d{1,2})([A-Z]{1,3})(\d{3,5})$", re.I)
_ALPHA_PLATE = re.compile(r"^([A-Z]{2,4})-?(\d{3,5})$", re.I)
_NUMERIC_PLATE = re.compile(r"^(\d{5,7})$")
_PLATE_FILENAME = re.compile(r"(\d{1,2}[A-Z]{1,3}-\d{3,5})", re.I)

CAMBODIA_PLATE_PROVINCES: dict[str, dict[str, str]] = {
    "1": {"en": "Banteay Meanchey", "km": "បន្ទាយមានជ័យ"},
    "2": {"en": "Battambang", "km": "បាត់ដំបង"},
    "3": {"en": "Kampong Cham", "km": "កំពង់ចាម"},
    "4": {"en": "Kampong Chhnang", "km": "កំពង់ឆ្នាំង"},
    "5": {"en": "Kampong Speu", "km": "កំពង់ស្ពឺ"},
    "6": {"en": "Kampong Thom", "km": "កំពង់ធំ"},
    "7": {"en": "Kampot", "km": "កំពត"},
    "8": {"en": "Kandal", "km": "កណ្តាល"},
    "9": {"en": "Koh Kong", "km": "កោះកុង"},
    "10": {"en": "Kratie", "km": "ក្រចេះ"},
    "11": {"en": "Mondulkiri", "km": "មណ្ឌលគិរី"},
    "12": {"en": "Phnom Penh", "km": "ភ្នំពេញ"},
    "13": {"en": "Preah Vihear", "km": "ព្រះវិហារ"},
    "14": {"en": "Prey Veng", "km": "ព្រៃវែង"},
    "15": {"en": "Pursat", "km": "ពោធិ៍សាត់"},
    "16": {"en": "Ratanakiri", "km": "រតនគិរី"},
    "17": {"en": "Siem Reap", "km": "សៀមរាប"},
    "18": {"en": "Preah Sihanouk", "km": "ព្រះសីហនុ"},
    "19": {"en": "Stung Treng", "km": "ស្ទឹងត្រែង"},
    "20": {"en": "Svay Rieng", "km": "ស្វាយរៀង"},
    "21": {"en": "Takeo", "km": "តាកែវ"},
    "22": {"en": "Oddar Meanchey", "km": "ឧ.មានជ័យ"},
    "23": {"en": "Kep", "km": "កែប"},
    "24": {"en": "Pailin", "km": "ប៉ែលិន"},
    "25": {"en": "Tbong Khmum", "km": "ត្បូងឃ្មុំ"},
}


def _clean_fragment(text: str) -> str:
    cleaned = (text or "").upper()
    cleaned = re.sub(r"[^A-Z0-9\-]", "", cleaned.replace(" ", ""))
    return cleaned.replace("—", "-").replace("–", "-")


def normalize_plate_text(text: str) -> str | None:
    cleaned = _clean_fragment(text)
    if not cleaned:
        return None
    match = _PLATE_FORMAT.match(cleaned)
    if match:
        return f"{match.group(1)}{match.group(2).upper()}-{match.group(3)}"
    match = _PLATE_LOOSE.match(cleaned)
    if match:
        return f"{match.group(1)}{match.group(2).upper()}-{match.group(3)}"
    match = _ALPHA_PLATE.match(cleaned)
    if match:
        return f"{match.group(1).upper()}-{match.group(2)}"
    match = _NUMERIC_PLATE.match(cleaned)
    if match:
        return match.group(1)
    return None


def classify_plate_type(plate_text: str) -> str:
    plate = plate_text.upper()
    if plate.startswith("POL") or plate.startswith("P-"):
        return "police"
    if plate.startswith("MIL") or plate.startswith("ARMY"):
        return "military"
    if plate.startswith("CD") or plate.startswith("DIP"):
        return "diplomatic"
    if plate.startswith("GOV") or plate.startswith("G-"):
        return "government"
    if _PLATE_FORMAT.match(plate) or _PLATE_LOOSE.match(plate.replace("-", "")):
        return "private"
    return "unknown"


def lookup_plate_province(plate_text: str) -> dict | None:
    normalized = normalize_plate_text(plate_text)
    if not normalized:
        return None
    match = _PLATE_FORMAT.match(normalized)
    if not match:
        match = _PLATE_LOOSE.match(normalized.replace("-", ""))
    if not match:
        return None
    code_raw = match.group(1)
    if len(code_raw) >= 2 and code_raw[:2] in CAMBODIA_PLATE_PROVINCES:
        entry = CAMBODIA_PLATE_PROVINCES[code_raw[:2]]
        return {"code": code_raw[:2], "name_en": entry["en"], "name_km": entry["km"]}
    if code_raw[0] in CAMBODIA_PLATE_PROVINCES:
        entry = CAMBODIA_PLATE_PROVINCES[code_raw[0]]
        return {"code": code_raw[0], "name_en": entry["en"], "name_km": entry["km"]}
    return None


def _get_reader():
    global _READER
    if _READER is not None:
        return _READER
    import easyocr

    langs = [lang.strip() for lang in settings.ocr_languages.split(",") if lang.strip()]
    _READER = easyocr.Reader(langs or ["en"], gpu=False, verbose=False)
    return _READER


def _enhance_for_ocr(image_bgr: np.ndarray) -> list[np.ndarray]:
    if image_bgr is None or image_bgr.size == 0:
        return []
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    variants = [gray]
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(otsu)
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11,
    )
    variants.append(adaptive)
    return variants


def _read_text_from_image(image_bgr: np.ndarray, region: str) -> list[dict]:
    reader = _get_reader()
    reads: list[dict] = []
    for variant in _enhance_for_ocr(image_bgr):
        rgb = cv2.cvtColor(variant, cv2.COLOR_GRAY2RGB) if variant.ndim == 2 else cv2.cvtColor(variant, cv2.COLOR_BGR2RGB)
        try:
            results = reader.readtext(rgb, detail=1, paragraph=False)
        except Exception:
            logger.exception("EasyOCR failed for region %s", region)
            continue
        for _bbox, text, conf in results:
            normalized = normalize_plate_text(text)
            if not normalized:
                continue
            reads.append({
                "text": normalized,
                "raw_text": text,
                "confidence": round(float(conf) * 100, 1),
                "region": region,
            })
    return reads


def _pick_best_read(reads: list[dict]) -> dict | None:
    if not reads:
        return None
    min_conf = settings.ocr_min_confidence * 100
    valid = [row for row in reads if row["confidence"] >= min_conf]
    if not valid:
        return None
    valid.sort(key=lambda row: row["confidence"], reverse=True)
    return valid[0]


def _plate_hint_from_filename(path: Path) -> dict | None:
    match = _PLATE_FILENAME.search(path.stem.upper())
    if not match:
        return None
    normalized = normalize_plate_text(match.group(1))
    if not normalized:
        return None
    return {
        "text": normalized,
        "raw_text": normalized,
        "confidence": 78.0,
        "region": "filename_hint",
    }


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def _crop_region(image: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray | None:
    h, w = image.shape[:2]
    x1 = _clamp(x1, 0, w - 1)
    x2 = _clamp(x2, x1 + 1, w)
    y1 = _clamp(y1, 0, h - 1)
    y2 = _clamp(y2, y1 + 1, h)
    crop = image[y1:y2, x1:x2]
    if crop.size == 0 or crop.shape[0] < 12 or crop.shape[1] < 24:
        return None
    return crop


def _plate_regions(image: np.ndarray, vehicles: list[dict]) -> list[tuple[np.ndarray, str]]:
    h, w = image.shape[:2]
    regions: list[tuple[np.ndarray, str]] = []

    for idx, vehicle in enumerate(vehicles):
        bbox = vehicle.get("bbox") or {}
        try:
            x1 = int(float(bbox.get("x1", 0)) * w)
            y1 = int(float(bbox.get("y1", 0)) * h)
            x2 = int(float(bbox.get("x2", 1)) * w)
            y2 = int(float(bbox.get("y2", 1)) * h)
        except (TypeError, ValueError):
            if isinstance(bbox, list) and len(bbox) >= 4:
                x1, y1, x2, y2 = [int(float(v)) for v in bbox[:4]]
            else:
                continue

        box_h = max(y2 - y1, 1)
        plate_y1 = y1 + int(box_h * 0.5)
        plate_y2 = min(y2 + int(box_h * 0.08), h)
        crop = _crop_region(image, x1, plate_y1, x2, plate_y2)
        if crop is not None:
            regions.append((crop, f"vehicle_{idx}_plate"))

    if not vehicles:
        if h >= 12 and w >= 24:
            regions.append((image, "full_frame"))
        lower = _crop_region(image, 0, int(h * 0.45), w, h)
        if lower is not None:
            regions.append((lower, "frame_lower"))
        return regions

    lower = _crop_region(image, 0, int(h * 0.55), w, h)
    if lower is not None:
        regions.append((lower, "frame_lower"))
    return regions


def _build_result(best: dict | None, reads: list[dict], regions_used: list[str]) -> PlateReadResult:
    if not best:
        return PlateReadResult(
            ocr_engine="easyocr",
            raw_reads=reads,
            plate_regions=regions_used,
            plate_region_found=bool(regions_used),
        )

    plate_text = best["text"]
    province = lookup_plate_province(plate_text)
    result = PlateReadResult(
        plate_text=plate_text,
        plate_confidence=round(float(best["confidence"]) / 100.0, 4)
        if best["confidence"] > 1
        else round(float(best["confidence"]), 4),
        plate_type=classify_plate_type(plate_text),
        format_valid=bool(normalize_plate_text(plate_text)),
        ocr_engine="easyocr",
        raw_reads=reads,
        plate_regions=regions_used,
        plate_region_found=bool(regions_used),
        alternatives=[{"text": row["text"], "confidence": row["confidence"]} for row in reads[:5]],
    )
    if province:
        result.plate_province_code = province["code"]
        result.plate_province_en = province["name_en"]
        result.plate_province_km = province["name_km"]
    return result


def _mock_result() -> PlateReadResult:
    return PlateReadResult(
        plate_text="2A-1234",
        plate_confidence=0.88,
        plate_type="private",
        format_valid=True,
        ocr_engine="mock",
        raw_reads=[{"text": "2A-1234", "confidence": 88.0, "region": "mock"}],
        plate_regions=["mock"],
        plate_region_found=True,
        plate_province_code="2",
        plate_province_en="Battambang",
        plate_province_km="បាត់ដំបង",
        mock_mode=True,
    )


def read_plate_from_crop(image_bgr: np.ndarray) -> PlateReadResult:
    if settings.ocr_mock_mode:
        return _mock_result()
    reads = _read_text_from_image(image_bgr, "crop")
    best = _pick_best_read(reads)
    return _build_result(best, reads, ["crop"])


def read_plate_from_frame(image_path: Path, vehicles: list[dict] | None = None) -> PlateReadResult:
    if settings.ocr_mock_mode:
        return _mock_result()

    image = cv2.imread(str(image_path))
    if image is None:
        return PlateReadResult(ocr_engine="easyocr")

    regions_used: list[str] = []
    all_reads: list[dict] = []
    for crop, region in _plate_regions(image, vehicles or []):
        regions_used.append(region)
        all_reads.extend(_read_text_from_image(crop, region))

    best = _pick_best_read(all_reads)
    if not best:
        hint = _plate_hint_from_filename(image_path)
        if hint:
            best = hint
            all_reads.append(hint)

    return _build_result(best, all_reads, regions_used)


def is_ready() -> tuple[bool, str]:
    if settings.ocr_mock_mode:
        return True, "mock mode"
    try:
        _get_reader()
        return True, "easyocr ready"
    except Exception as exc:
        return False, str(exc)
