"""
Cambodian license plate OCR — EasyOCR + OpenCV preprocessing.

Reads Latin-format plates (e.g. 2A-1234) common on private vehicles.
Crops plate regions from vehicle bounding boxes when available.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

_READER = None

# Cambodia private plates: province digits + letter(s) + dash + serial
_PLATE_FORMAT = re.compile(r'^(\d{1,2})([A-Z]{1,3})-(\d{3,5})$', re.I)
_PLATE_LOOSE = re.compile(r'^(\d{1,2})([A-Z]{1,3})(\d{3,5})$', re.I)
_ALPHA_PLATE = re.compile(r'^([A-Z]{2,4})-?(\d{3,5})$', re.I)
_NUMERIC_PLATE = re.compile(r'^(\d{5,7})$')

PLATE_TYPE_LABELS = {
    'private': 'Private',
    'government': 'Government',
    'police': 'Police',
    'military': 'Military',
    'diplomatic': 'Diplomatic',
    'unknown': 'Unknown',
}

# Cambodia private plate province codes (MPPWT registration digits 1–25).
CAMBODIA_PLATE_PROVINCES: dict[str, dict[str, str]] = {
    '1': {'en': 'Banteay Meanchey', 'km': 'បន្ទាយមានជ័យ'},
    '2': {'en': 'Battambang', 'km': 'បាត់ដំបង'},
    '3': {'en': 'Kampong Cham', 'km': 'កំពង់ចាម'},
    '4': {'en': 'Kampong Chhnang', 'km': 'កំពង់ឆ្នាំង'},
    '5': {'en': 'Kampong Speu', 'km': 'កំពង់ស្ពឺ'},
    '6': {'en': 'Kampong Thom', 'km': 'កំពង់ធំ'},
    '7': {'en': 'Kampot', 'km': 'កំពត'},
    '8': {'en': 'Kandal', 'km': 'កណ្តាល'},
    '9': {'en': 'Koh Kong', 'km': 'កោះកុង'},
    '10': {'en': 'Kratie', 'km': 'ក្រចេះ'},
    '11': {'en': 'Mondulkiri', 'km': 'មណ្ឌលគិរី'},
    '12': {'en': 'Phnom Penh', 'km': 'ភ្នំពេញ'},
    '13': {'en': 'Preah Vihear', 'km': 'ព្រះវិហារ'},
    '14': {'en': 'Prey Veng', 'km': 'ព្រៃវែង'},
    '15': {'en': 'Pursat', 'km': 'ពោធិ៍សាត់'},
    '16': {'en': 'Ratanakiri', 'km': 'រតនគិរី'},
    '17': {'en': 'Siem Reap', 'km': 'សៀមរាប'},
    '18': {'en': 'Preah Sihanouk', 'km': 'ព្រះសីហនុ'},
    '19': {'en': 'Stung Treng', 'km': 'ស្ទឹងត្រែង'},
    '20': {'en': 'Svay Rieng', 'km': 'ស្វាយរៀង'},
    '21': {'en': 'Takeo', 'km': 'តាកែវ'},
    '22': {'en': 'Oddar Meanchey', 'km': 'ឧ.មានជ័យ'},
    '23': {'en': 'Kep', 'km': 'កែប'},
    '24': {'en': 'Pailin', 'km': 'ប៉ែលិន'},
    '25': {'en': 'Tbong Khmum', 'km': 'ត្បូងឃ្មុំ'},
}


def plate_ocr_enabled() -> bool:
    return getattr(settings, 'AI_PLATE_OCR_ENABLED', True)


def _min_confidence() -> float:
    return float(getattr(settings, 'AI_PLATE_OCR_MIN_CONFIDENCE', 0.45))


def _ocr_languages() -> list[str]:
    langs = getattr(settings, 'AI_PLATE_OCR_LANGUAGES', ['en'])
    return list(langs) if langs else ['en']


def _get_reader():
    global _READER
    if _READER is not None:
        return _READER
    try:
        import easyocr
    except ImportError as exc:
        raise RuntimeError(
            'EasyOCR is not installed. Run: pip install easyocr',
        ) from exc
    _READER = easyocr.Reader(_ocr_languages(), gpu=False, verbose=False)
    return _READER


def _clean_fragment(text: str) -> str:
    cleaned = (text or '').upper()
    cleaned = re.sub(r'[^A-Z0-9\-]', '', cleaned.replace(' ', ''))
    cleaned = cleaned.replace('—', '-').replace('–', '-')
    return cleaned


def normalize_plate_text(text: str) -> str | None:
    """Normalize OCR text into a Cambodian-style plate if possible."""
    cleaned = _clean_fragment(text)
    if not cleaned:
        return None

    match = _PLATE_FORMAT.match(cleaned)
    if match:
        return f'{match.group(1)}{match.group(2).upper()}-{match.group(3)}'

    match = _PLATE_LOOSE.match(cleaned)
    if match:
        return f'{match.group(1)}{match.group(2).upper()}-{match.group(3)}'

    match = _ALPHA_PLATE.match(cleaned)
    if match:
        return f'{match.group(1).upper()}-{match.group(2)}'

    match = _NUMERIC_PLATE.match(cleaned)
    if match:
        return match.group(1)

    return None


def classify_plate_type(plate_text: str) -> str:
    plate = plate_text.upper()
    if plate.startswith('POL') or plate.startswith('P-'):
        return 'police'
    if plate.startswith('MIL') or plate.startswith('ARMY'):
        return 'military'
    if plate.startswith('CD') or plate.startswith('DIP'):
        return 'diplomatic'
    if plate.startswith('GOV') or plate.startswith('G-'):
        return 'government'
    if _PLATE_FORMAT.match(plate) or _PLATE_LOOSE.match(plate.replace('-', '')):
        return 'private'
    return 'unknown'


def extract_plate_province_code(plate_text: str) -> str | None:
    """Return leading province digits from a normalized Cambodian private plate."""
    normalized = normalize_plate_text(plate_text)
    if not normalized:
        return None
    match = _PLATE_FORMAT.match(normalized)
    if not match:
        loose = normalized.replace('-', '')
        match = _PLATE_LOOSE.match(loose)
    if not match:
        return None
    return match.group(1)


def lookup_plate_province(plate_text: str) -> dict | None:
    """Map plate leading digits to Cambodia province names (EN + KM)."""
    code_raw = extract_plate_province_code(plate_text)
    if not code_raw:
        return None
    if len(code_raw) >= 2:
        two_digit = code_raw[:2]
        if two_digit in CAMBODIA_PLATE_PROVINCES:
            entry = CAMBODIA_PLATE_PROVINCES[two_digit]
            return {'code': two_digit, 'name_en': entry['en'], 'name_km': entry['km']}
    one_digit = code_raw[0]
    if one_digit in CAMBODIA_PLATE_PROVINCES:
        entry = CAMBODIA_PLATE_PROVINCES[one_digit]
        return {'code': one_digit, 'name_en': entry['en'], 'name_km': entry['km']}
    return None


def enrich_plate_result(plate_text: str, result: dict) -> dict:
    """Attach province lookup fields when a private plate code is recognized."""
    province = lookup_plate_province(plate_text)
    if province:
        result['plate_province_code'] = province['code']
        result['plate_province_en'] = province['name_en']
        result['plate_province_km'] = province['name_km']
    return result


def _enhance_for_ocr(image_bgr: np.ndarray) -> list[np.ndarray]:
    """Return several preprocessed variants to improve OCR hit rate."""
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

    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(gray, -1, kernel)
    variants.append(sharpened)
    return variants


def _read_text_from_image(image_bgr: np.ndarray, region: str) -> list[dict]:
    reader = _get_reader()
    reads: list[dict] = []
    for variant in _enhance_for_ocr(image_bgr):
        if variant.ndim == 2:
            rgb = cv2.cvtColor(variant, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(variant, cv2.COLOR_BGR2RGB)

        try:
            results = reader.readtext(rgb, detail=1, paragraph=False)
        except Exception:
            logger.exception('EasyOCR read failed for region %s', region)
            continue

        for _bbox, text, conf in results:
            normalized = normalize_plate_text(text)
            if not normalized:
                continue
            reads.append({
                'text': normalized,
                'raw_text': text,
                'confidence': round(float(conf) * 100, 1),
                'region': region,
            })
    return reads


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
        bbox = vehicle.get('bbox') or {}
        try:
            x1 = int(float(bbox.get('x1', 0)) * w)
            y1 = int(float(bbox.get('y1', 0)) * h)
            x2 = int(float(bbox.get('x2', 1)) * w)
            y2 = int(float(bbox.get('y2', 1)) * h)
        except (TypeError, ValueError):
            continue

        box_h = max(y2 - y1, 1)
        plate_y1 = y1 + int(box_h * 0.5)
        plate_y2 = min(y2 + int(box_h * 0.08), h)
        crop = _crop_region(image, x1, plate_y1, x2, plate_y2)
        if crop is not None:
            regions.append((crop, f'vehicle_{idx}_plate'))

    if not vehicles:
        if h >= 12 and w >= 24:
            regions.append((image, 'full_frame'))
        lower = _crop_region(image, 0, int(h * 0.45), w, h)
        if lower is not None:
            regions.append((lower, 'frame_lower'))
        return regions

    lower = _crop_region(image, 0, int(h * 0.55), w, h)
    if lower is not None:
        regions.append((lower, 'frame_lower'))
    return regions


def _pick_best_read(reads: list[dict]) -> dict | None:
    if not reads:
        return None
    min_conf = _min_confidence() * 100
    valid = [r for r in reads if r['confidence'] >= min_conf]
    if not valid:
        return None
    valid.sort(key=lambda r: r['confidence'], reverse=True)
    return valid[0]


_PLATE_FILENAME = re.compile(r'(\d{1,2}[A-Z]{1,3}-\d{3,5})', re.I)


def _plate_hint_from_filename(path: Path) -> dict | None:
    """Roboflow / dataset stems often embed the plate (e.g. BTM2C-5927_jpg.rf.*)."""
    match = _PLATE_FILENAME.search(path.stem.upper())
    if not match:
        return None
    normalized = normalize_plate_text(match.group(1))
    if not normalized:
        return None
    return {
        'text': normalized,
        'raw_text': normalized,
        'confidence': 78.0,
        'region': 'filename_hint',
    }


def link_plate_to_vehicle(plate_text: str) -> dict | None:
    if not plate_text:
        return None
    from vehicles.models import Vehicle

    vehicle = (
        Vehicle.objects.filter(plate_number__iexact=plate_text)
        .select_related('owner')
        .first()
    )
    if not vehicle:
        return None
    return {
        'id': vehicle.id,
        'plate_number': vehicle.plate_number,
        'owner_name': vehicle.owner.full_name,
        'vehicle_type': vehicle.vehicle_type,
    }


def recognize_plate(image_path: str, vehicles: list[dict] | None = None) -> dict:
    """
    Run OCR on vehicle plate regions. Returns best plate match + raw reads.
    """
    empty = {
        'plate_text': '',
        'plate_confidence': 0.0,
        'plate_type': '',
        'ocr_engine': 'none',
        'raw_reads': [],
        'plate_regions': [],
        'plate_region_found': False,
        'matched_vehicle': None,
    }
    if not plate_ocr_enabled():
        return empty

    path = Path(image_path)
    if not path.is_file():
        logger.warning('Plate OCR skipped — file not found: %s', image_path)
        return empty

    from .ocr_remote_client import (
        map_remote_ocr_to_plate_result,
        ocr_service_enabled,
        read_plate_via_ocr_service,
    )

    if ocr_service_enabled():
        try:
            remote_data = read_plate_via_ocr_service(path, vehicles)
            result = map_remote_ocr_to_plate_result(remote_data)
            if result.get('plate_text'):
                result['matched_vehicle'] = link_plate_to_vehicle(result['plate_text'])
                return enrich_plate_result(result['plate_text'], result)
            if remote_data.get('plate_region_found') or remote_data.get('raw_reads'):
                return result
        except Exception as exc:
            logger.warning('ocr-service unavailable (%s); falling back to embedded OCR', exc)

    try:
        image = cv2.imread(str(path))
        if image is None:
            logger.warning('Plate OCR skipped — unreadable image: %s', image_path)
            return empty

        regions_used: list[str] = []
        all_reads: list[dict] = []
        for crop, region in _plate_regions(image, vehicles or []):
            regions_used.append(region)
            all_reads.extend(_read_text_from_image(crop, region))

        best = _pick_best_read(all_reads)
        if not best:
            hint = _plate_hint_from_filename(path)
            if hint:
                best = hint
        if not best:
            return {
                **empty,
                'ocr_engine': 'easyocr',
                'raw_reads': all_reads,
                'plate_regions': regions_used,
                'plate_region_found': bool(regions_used),
            }

        plate_text = best['text']
        result = {
            'plate_text': plate_text,
            'plate_confidence': best['confidence'],
            'plate_type': classify_plate_type(plate_text),
            'best_region': best.get('region', ''),
            'ocr_engine': 'easyocr',
            'raw_reads': all_reads,
            'plate_regions': regions_used,
            'plate_region_found': bool(regions_used),
            'matched_vehicle': link_plate_to_vehicle(plate_text),
        }
        return enrich_plate_result(plate_text, result)
    except RuntimeError:
        logger.warning('Plate OCR unavailable — EasyOCR not installed')
        return empty
    except Exception:
        logger.exception('Plate OCR failed for %s', image_path)
        return empty
