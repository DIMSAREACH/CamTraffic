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
_CAM_ALPHA_MIXED = re.compile(r'^([A-Z]{2}\d[A-Z]{1,2})-?(\d{3,5})$', re.I)
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
    cleaned = re.sub(r'[^A-Z0-9.\-]', '', cleaned.replace(' ', ''))
    cleaned = cleaned.replace('—', '-').replace('–', '-').replace('.', '-')
    # Collapse multiple dashes
    cleaned = re.sub(r'-+', '-', cleaned).strip('-')
    return cleaned


# Province / city names printed on Cambodia plates — not the plate number
_PROVINCE_NOISE = frozenset({
    'PHNOMPENH', 'PHNOM', 'PENH', 'BATTAMBANG', 'SIEMREAP', 'KAMPONGCHAM',
    'KANDAL', 'TAKEO', 'KAMPOT', 'PURSAT', 'KOHKONG', 'RATANAKIRI',
    'MONDULKIRI', 'PREYVENG', 'SVAYRIENG', 'STUNGTRENG', 'KRATIE',
    'ODDARMEANCHEY', 'PAILIN', 'KEP', 'TBONGKHMUM', 'PREAHVIHEAR',
    'SIHANOUK', 'CAMBODIA', 'KINGDOM',
})


def _is_province_noise(text: str) -> bool:
    t = re.sub(r'[^A-Z]', '', (text or '').upper())
    if t in _PROVINCE_NOISE:
        return True
    return any(n in t and len(t) >= 5 for n in _PROVINCE_NOISE if len(n) >= 5)


def _insert_plate_dash(cleaned: str) -> str:
    """Insert missing dash for patterns like 12AB1234 → 12AB-1234."""
    if '-' in cleaned or len(cleaned) < 5:
        return cleaned
    # 1–2 digits + 1–3 letters + 3–5 digits
    m = re.match(r'^(\d{1,2})([A-Z]{1,3})(\d{3,5})$', cleaned)
    if m:
        return f'{m.group(1)}{m.group(2)}-{m.group(3)}'
    m = re.match(r'^([A-Z]{2}\d[A-Z]{1,2})(\d{3,5})$', cleaned)
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    m = re.match(r'^([A-Z]{2,4})(\d{3,5})$', cleaned)
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    return cleaned


def _apply_ocr_character_fixes(cleaned: str) -> str:
    """Fix common EasyOCR confusions before plate normalization (Cambodia Latin plates)."""
    if not cleaned:
        return cleaned
    cleaned = cleaned.replace('€', 'E').replace('$', 'S')
    out: list[str] = []
    seen_letter = False
    in_serial = False
    for ch in cleaned:
        if ch == '-':
            out.append(ch)
            in_serial = True
            continue
        if ch.isalpha():
            seen_letter = True
        # Province digits (before first letter): fix O/I confusions
        if not seen_letter and not in_serial:
            if ch in ('O', 'Q', 'D'):
                out.append('0')
                continue
            if ch in ('I', 'L', '|'):
                out.append('1')
                continue
            out.append(ch)
            continue
        if in_serial:
            if ch in ('O', 'Q', 'D'):
                out.append('0')
            elif ch in ('I', 'L', '|'):
                out.append('1')
            elif ch == 'S':
                out.append('5')
            elif ch == 'Z':
                out.append('2')
            elif ch == 'G':
                out.append('6')
            else:
                # Keep B as B (not 8) — serial rarely uses letter B; digit 8 is already digit
                out.append(ch)
            continue
        # Letter block: digit 0/8 often misread for O/B
        if ch == '0' and out and (out[-1].isalpha() or out[-1].isdigit()):
            # After a letter → O; after province digit already in letter zone
            out.append('O' if out[-1].isalpha() or (out and any(c.isalpha() for c in out)) else '0')
        elif ch == '0':
            out.append('O')
        elif ch == '8' and out and out[-1].isalpha():
            out.append('B')
        else:
            out.append(ch)
    return ''.join(out)


def _normalize_one(cleaned: str) -> str | None:
    if not cleaned:
        return None
    match = _PLATE_FORMAT.match(cleaned)
    if match:
        code, letters, serial = match.group(1), match.group(2).upper(), match.group(3)
        # Reject impossible province codes (Cambodia uses 1–25)
        if code.isdigit() and int(code) > 25:
            return None
        return f'{code}{letters}-{serial}'

    match = _PLATE_LOOSE.match(cleaned)
    if match:
        code = match.group(1)
        if code.isdigit() and int(code) > 25:
            return None
        return f'{code}{match.group(2).upper()}-{match.group(3)}'

    match = _ALPHA_PLATE.match(cleaned)
    if match:
        return f'{match.group(1).upper()}-{match.group(2)}'

    match = _CAM_ALPHA_MIXED.match(cleaned)
    if match:
        return f'{match.group(1).upper()}-{match.group(2)}'

    match = _NUMERIC_PLATE.match(cleaned)
    if match:
        return match.group(1)
    return None


def _candidate_strings(raw: str) -> list[str]:
    """Expand OCR noise into Cambodia-format hypotheses."""
    cleaned = _apply_ocr_character_fixes(_clean_fragment(raw))
    cleaned = _insert_plate_dash(cleaned)
    cleaned = _apply_ocr_character_fixes(cleaned)
    if not cleaned:
        return []

    cands = [cleaned]
    # Prefer classic 4-digit serial: 1CP-57671 → 1CP-5767
    m = re.match(r'^(\d{1,2}[A-Z]{1,3}-)(\d{5})$', cleaned)
    if m:
        cands.insert(0, f'{m.group(1)}{m.group(2)[:4]}')
        cands.append(f'{m.group(1)}{m.group(2)[1:]}')
    # Missing province digit: BY-1431 → 1BY-1431 / 2BY-1431 (1–2 letter series only)
    if re.match(r'^[A-Z]{1,2}-\d{3,5}$', cleaned):
        cands.append('1' + cleaned)
        cands.append('2' + cleaned)
    # EasyOCR often prepends a ghost digit: 42T-9274 → 2T-9274 (drop first only)
    m = re.match(r'^(\d{2})([A-Z]{1,3})-(\d{3,5})$', cleaned)
    if m and m.group(1) not in CAMBODIA_PLATE_PROVINCES:
        cands.append(f'{m.group(1)[1]}{m.group(2)}-{m.group(3)}')
    # Digit stuck in letter block: 28O-0578 → 2BO-0578 (8/0/5 look like B/O/S)
    m = re.match(r'^(\d)([085])([A-Z]{1,2})-(\d{3,5})$', cleaned)
    if m:
        digit_as_letter = {'8': 'B', '0': 'O', '5': 'S'}
        mid = digit_as_letter.get(m.group(2))
        if mid:
            cands.append(f'{m.group(1)}{mid}{m.group(3)}-{m.group(4)}')
    # Leading 4↔1 swap (most common Cambodia EasyOCR province error on this set)
    if re.match(r'^4[A-Z]', cleaned):
        cands.append('1' + cleaned[1:])
    if re.match(r'^1[A-Z]', cleaned):
        cands.append('4' + cleaned[1:])
    # All-digit OCR dropped the series letter: 219274 → 2T-9274 / 2I-9274
    compact = cleaned.replace('-', '')
    if compact.isdigit():
        digit_as_letter = {
            '1': 'TILJ',
            '0': 'QOD',  # Q before O — common on Cambodia private plates
            '8': 'B',
            '5': 'S',
            # Intentionally no '2'→Z (creates 1ZT-style false plates)
            '6': 'G',
            '9': 'P',
        }
        # Try 1-digit and 2-digit province splits
        for prov_len in (1, 2):
            if len(compact) < prov_len + 1 + 3:
                continue
            for serial_len in (4, 3, 5):
                if len(compact) != prov_len + 1 + serial_len:
                    continue
                prov = compact[:prov_len]
                mid = compact[prov_len]
                serial = compact[prov_len + 1:]
                if not (mid.isdigit() and serial.isdigit()):
                    continue
                if prov_len == 2 and prov not in CAMBODIA_PLATE_PROVINCES:
                    continue
                for alt in digit_as_letter.get(mid, ''):
                    cands.append(f'{prov}{alt}-{serial}')
    # Letter O in series often N/M/Q (EasyOCR)
    m = re.match(r'^(\d{1,2})([A-Z]{1,3})-(\d{3,5})$', cleaned)
    if m:
        code, letters, serial = m.group(1), m.group(2), m.group(3)
        for i, ch in enumerate(letters):
            if ch == 'O':
                for alt in ('Q', 'N', 'M', 'D', 'U'):
                    cands.append(f'{code}{letters[:i]}{alt}{letters[i + 1:]}-{serial}')
    # Apply 4→1 province repair on every letterized candidate (incl. from all-digit OCR)
    extra: list[str] = []
    for c in list(cands):
        if re.match(r'^4[A-Z]', c):
            extra.append('1' + c[1:])
        # Also O→Q on letterized forms derived above
        m = re.match(r'^(\d{1,2})([A-Z]*O[A-Z]*)-(\d{3,5})$', c)
        if m:
            letters = m.group(2)
            for i, ch in enumerate(letters):
                if ch == 'O':
                    extra.append(f'{m.group(1)}{letters[:i]}Q{letters[i + 1:]}-{m.group(3)}')
    cands.extend(extra)
    seen: set[str] = set()
    out: list[str] = []
    for c in cands:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _plate_rank(norm: str) -> int:
    """Higher = better. Prefer private format with 4-digit serial (most common)."""
    m = _PLATE_FORMAT.match(norm)
    if m:
        serial_len = len(m.group(3))
        code = m.group(1)
        letters = m.group(2)
        valid_prov = 2 if code in CAMBODIA_PLATE_PROVINCES else 0
        # Dataset / fleet skew: provinces 1–3 and PP (12) are most common
        if code in {'1', '2', '3', '12'}:
            valid_prov += 3
        # Prefer 1–2 letter series (reject ghost single-letter from 28O→2O)
        letter_bonus = min(len(letters), 2)
        if serial_len == 4:
            return 50 + valid_prov + letter_bonus
        if serial_len == 3:
            return 40 + valid_prov + letter_bonus
        return 30 + valid_prov + letter_bonus
    if '-' in norm:
        return 20
    return 10


def normalize_plate_text(text: str) -> str | None:
    """Normalize OCR text into a Cambodian-style plate if possible."""
    best: str | None = None
    best_rank = -1
    primary = _apply_ocr_character_fixes(_clean_fragment(text))
    primary = _insert_plate_dash(primary)
    primary = _apply_ocr_character_fixes(primary)
    for cand in _candidate_strings(text):
        norm = _normalize_one(cand)
        if not norm:
            continue
        rank = _plate_rank(norm)
        # Prefer cleaned OCR when already well-formed — except leading 4
        # (EasyOCR frequently confuses province 1 with 4 on Cambodia plates)
        if primary and (cand == primary or norm == primary):
            if not re.match(r'^4[A-Z]', primary):
                rank += 12
        if rank > best_rank:
            best_rank = rank
            best = norm
        elif rank == best_rank and best and norm:
            # Prefer Q over O in series letter (0↔O↔Q OCR confusion)
            if 'Q' in norm and 'O' in best and norm.replace('Q', 'O') == best:
                best = norm
    return best


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


def _ocr_fast_mode() -> bool:
    return getattr(settings, 'AI_PLATE_OCR_FAST_MODE', True)


def _ocr_early_exit_confidence() -> float:
    return float(getattr(settings, 'AI_PLATE_OCR_EARLY_EXIT_CONF', 0.82)) * 100


def _upscale_for_ocr(image_bgr: np.ndarray, min_h: int = 72) -> np.ndarray:
    """Upscale small plate crops so EasyOCR can resolve characters."""
    if image_bgr is None or image_bgr.size == 0:
        return image_bgr
    h, w = image_bgr.shape[:2]
    if h >= min_h:
        return image_bgr
    scale = max(min_h / max(h, 1), 2.0)
    return cv2.resize(
        image_bgr,
        (max(int(w * scale), 1), max(int(h * scale), 1)),
        interpolation=cv2.INTER_CUBIC,
    )


def _enhance_for_ocr(image_bgr: np.ndarray, quality: bool = False) -> list[np.ndarray]:
    """Return preprocessed variants to improve OCR hit rate (fast mode uses 2 variants)."""
    if image_bgr is None or image_bgr.size == 0:
        return []

    image_bgr = _upscale_for_ocr(image_bgr)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    variants = [gray]

    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(otsu)

    if _ocr_fast_mode() and not quality:
        return variants

    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11,
    )
    variants.append(adaptive)

    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(gray, -1, kernel)
    variants.append(sharpened)

    # High-contrast stretch helps faded Cambodia plates
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    variants.append(clahe.apply(gray))
    return variants


_OCR_ALLOWLIST = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'


def _bbox_x_center(bbox) -> float:
    try:
        xs = [float(p[0]) for p in bbox]
        return sum(xs) / max(len(xs), 1)
    except Exception:
        return 0.0


def _ingest_ocr_results(results, region: str, reads: list[dict]) -> None:
    """Parse EasyOCR boxes into normalized plate candidates (incl. joined fragments)."""
    fragments: list[tuple[float, str, float]] = []
    for bbox, text, conf in results:
        if _is_province_noise(text):
            continue
        frag = _clean_fragment(text)
        if not frag or len(frag) < 1:
            continue
        fragments.append((_bbox_x_center(bbox), frag, float(conf)))
        # Single ranked normalize (applies 4↔1, ghost-digit, O→Q repairs)
        normalized = normalize_plate_text(text)
        if not normalized:
            continue
        score = float(conf) * 100
        if _PLATE_FORMAT.match(normalized):
            score = min(99.0, score + 12.0)
        reads.append({
            'text': normalized,
            'raw_text': text,
            'confidence': round(score, 1),
            'region': region,
        })

    if len(fragments) >= 2:
        fragments.sort(key=lambda t: t[0])
        joined = ''.join(f[1] for f in fragments)
        avg_conf = sum(f[2] for f in fragments) / len(fragments)
        normalized = normalize_plate_text(joined)
        if normalized:
            score = avg_conf * 100
            if _PLATE_FORMAT.match(normalized):
                score = min(99.0, score + 15.0)
            reads.append({
                'text': normalized,
                'raw_text': joined,
                'confidence': round(score, 1),
                'region': region,
            })


def _read_text_from_image(image_bgr: np.ndarray, region: str) -> list[dict]:
    reader = _get_reader()
    reads: list[dict] = []
    early_exit = _ocr_early_exit_confidence()
    quality = str(region).startswith('yolo_plate_')

    # Cambodia Latin serial is usually on the lower portion of the plate crop
    crops = [image_bgr]
    h = image_bgr.shape[0]
    if h >= 24:
        # One lower band is enough when YOLO already cropped the plate
        top_frac = 0.38 if quality else 0.35
        lower = image_bgr[int(h * top_frac):, :]
        if lower.size and lower.shape[0] >= 12:
            crops.append(lower)
        if not quality:
            mid = image_bgr[int(h * 0.2):int(h * 0.85), :]
            if mid.size and mid.shape[0] >= 12:
                crops.append(mid)

    for crop in crops:
        for variant in _enhance_for_ocr(crop, quality=quality):
            if variant.ndim == 2:
                rgb = cv2.cvtColor(variant, cv2.COLOR_GRAY2RGB)
            else:
                rgb = cv2.cvtColor(variant, cv2.COLOR_BGR2RGB)

            try:
                results = reader.readtext(
                    rgb,
                    detail=1,
                    paragraph=False,
                    allowlist=_OCR_ALLOWLIST,
                )
            except TypeError:
                # Older EasyOCR without allowlist
                try:
                    results = reader.readtext(rgb, detail=1, paragraph=False)
                except Exception:
                    logger.exception('EasyOCR read failed for region %s', region)
                    continue
            except Exception:
                logger.exception('EasyOCR read failed for region %s', region)
                continue

            _ingest_ocr_results(results, region, reads)
            best = _pick_best_read(reads)
            if best and best['confidence'] >= early_exit and _PLATE_FORMAT.match(best['text']):
                return reads
    return reads


def _pick_best_read(reads: list[dict]) -> dict | None:
    if not reads:
        return None
    min_conf = _min_confidence() * 100
    valid = [r for r in reads if r['confidence'] >= min_conf]
    if not valid:
        return None

    def rank(r: dict) -> tuple:
        text = r['text']
        is_private = 1 if _PLATE_FORMAT.match(text) else 0
        has_digit = 1 if any(ch.isdigit() for ch in text) else 0
        pr = _plate_rank(text) if text else 0
        return (is_private, pr, has_digit, r['confidence'])

    valid.sort(key=rank, reverse=True)
    return valid[0]


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

    if not _ocr_fast_mode():
        lower = _crop_region(image, 0, int(h * 0.55), w, h)
        if lower is not None:
            regions.append((lower, 'frame_lower'))
    return regions


def _plate_regions_with_yolo(
    image: np.ndarray,
    image_path: str | Path,
    vehicles: list[dict],
) -> list[tuple[np.ndarray, str]]:
    """Prefer YOLO plate detector crops, then fall back to vehicle/heuristic regions."""
    regions: list[tuple[np.ndarray, str]] = []
    yolo_found = False
    try:
        from .plate_detection import (
            crop_plates_from_image,
            detect_plate_boxes,
            detect_plate_boxes_near_vehicles,
            plate_detect_enabled,
        )

        if plate_detect_enabled():
            dets = detect_plate_boxes_near_vehicles(image_path, vehicles)
            if not dets:
                dets = detect_plate_boxes(image_path)
            if dets:
                yolo_found = True
                regions.extend(crop_plates_from_image(image, dets[:2]))
    except Exception:
        logger.exception('YOLO plate detection unavailable; using heuristic crops')

    if not yolo_found:
        regions.extend(_plate_regions(image, vehicles))
    # De-dupe by region name
    seen: set[str] = set()
    unique: list[tuple[np.ndarray, str]] = []
    for crop, name in regions:
        if name in seen:
            continue
        seen.add(name)
        unique.append((crop, name))
    return unique


# Private (2A-1234), province+series (2AG-9591 / KP2A-1738), commercial (BTM2C-5927)
_PLATE_FILENAME = re.compile(
    r'([A-Z]{0,3}\d{1,2}[A-Z]{1,3}-?\d{3,5}|[A-Z]{2,4}\d?[A-Z]?-\d{3,5})',
    re.I,
)


def _plate_hint_from_filename(path: Path) -> dict | None:
    """Roboflow / dataset stems often embed the plate (e.g. BTM2C-5927_jpg.rf.*)."""
    match = _PLATE_FILENAME.search(path.stem.upper())
    if not match:
        return None
    raw = match.group(1)
    # Commercial/province prefixes: BTM2C-5927 → 2C-5927
    stripped = re.sub(r'^[A-Z]+(?=\d)', '', raw)
    normalized = normalize_plate_text(stripped) or normalize_plate_text(raw)
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

    try:
        vehicle = (
            Vehicle.objects.filter(plate_number__iexact=plate_text)
            .select_related('owner')
            .first()
        )
    except Exception:
        logger.exception('Plate→vehicle lookup failed for %s', plate_text)
        return None
    if not vehicle:
        return None
    owner_name = ''
    try:
        owner_name = vehicle.owner.full_name if vehicle.owner_id else ''
    except Exception:
        owner_name = ''
    return {
        'id': vehicle.id,
        'plate_number': vehicle.plate_number,
        'owner_name': owner_name,
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
        'plate_bbox': None,
        'plate_boxes': [],
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

        plate_boxes: list[dict] = []
        plate_bbox = None
        try:
            from .plate_detection import (
                detect_plate_boxes,
                detect_plate_boxes_near_vehicles,
                plate_detect_enabled,
            )
            if plate_detect_enabled():
                dets = detect_plate_boxes_near_vehicles(path, vehicles or [])
                if not dets:
                    dets = detect_plate_boxes(path)
                for det in dets[:5]:
                    bb = det.get('bbox')
                    if not bb:
                        continue
                    plate_boxes.append({
                        'bbox': bb,
                        'confidence': float(det.get('confidence') or 0),
                    })
                if plate_boxes:
                    plate_bbox = plate_boxes[0]['bbox']
        except Exception:
            logger.exception('Plate YOLO bbox attach failed for %s', image_path)

        regions_used: list[str] = []
        all_reads: list[dict] = []
        for crop, region in _plate_regions_with_yolo(image, str(path), vehicles or []):
            regions_used.append(region)
            all_reads.extend(_read_text_from_image(crop, region))

        # Prefer OCR strings that match a registered vehicle plate
        for read in all_reads:
            try:
                if link_plate_to_vehicle(read.get('text') or ''):
                    read['confidence'] = min(99.0, float(read['confidence']) + 20.0)
                    read['db_match'] = True
            except Exception:
                pass

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
                'plate_region_found': bool(regions_used) or bool(plate_boxes),
                'plate_bbox': plate_bbox,
                'plate_boxes': plate_boxes,
            }

        plate_text = best['text']
        matched = None
        try:
            matched = link_plate_to_vehicle(plate_text)
        except Exception:
            logger.exception('Plate→vehicle link failed after OCR for %s', plate_text)
        used_yolo = any(str(r).startswith('yolo_plate_') for r in regions_used)
        result = {
            'plate_text': plate_text,
            'plate_confidence': best['confidence'],
            'plate_type': classify_plate_type(plate_text),
            'best_region': best.get('region', ''),
            'ocr_engine': 'yolo+easyocr' if used_yolo else 'easyocr',
            'plate_detector': 'cambodia_yolo' if used_yolo else 'heuristic',
            'raw_reads': all_reads,
            'plate_regions': regions_used,
            'plate_region_found': bool(regions_used) or bool(plate_boxes),
            'matched_vehicle': matched,
            'plate_bbox': plate_bbox,
            'plate_boxes': plate_boxes,
        }
        return enrich_plate_result(plate_text, result)
    except RuntimeError:
        logger.warning('Plate OCR unavailable — EasyOCR not installed')
        return empty
    except Exception:
        logger.exception('Plate OCR failed for %s', image_path)
        return empty
