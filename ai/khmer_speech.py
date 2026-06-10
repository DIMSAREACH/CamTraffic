"""Khmer display and TTS text for Cambodia traffic signs."""
from __future__ import annotations

import json
import re
from pathlib import Path

KHMER_RE = re.compile(r'[\u1780-\u17FF]')
ROOT = Path(__file__).resolve().parent
META_PATH = ROOT / 'reference_sign_meta.json'
CATALOG_PATH = ROOT / 'sign_catalog.json'

_CATEGORY_LABELS = {
    'prohibitory': 'សញ្ញាហាមឃាត់',
    'warning': 'សញ្ញាព្រមាន',
    'mandatory': 'សញ្ញាបញ្ជា',
    'informative': 'សញ្ញាផ្តល់ព័ត៌មាន',
}


def _load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _load_meta_rows() -> dict[str, dict]:
    return _load_json(META_PATH)


def _load_catalog_rows() -> list[dict]:
    data = _load_json(CATALOG_PATH)
    return data if isinstance(data, list) else []


def _build_english_name_khmer() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in _load_catalog_rows():
        en = (row.get('sign_name_en') or '').strip().lower()
        km = (row.get('sign_name_km') or row.get('sign_name') or '').strip()
        if en and km and KHMER_RE.search(km):
            mapping[en] = km
    for row in _load_meta_rows().values():
        en = (row.get('sign_name_en') or '').strip().lower()
        km = (row.get('sign_name_km') or '').strip()
        if en and km and KHMER_RE.search(km):
            mapping[en] = km
    return mapping


ENGLISH_NAME_KHMER = _build_english_name_khmer()


def has_khmer(text: str) -> bool:
    return bool(text and KHMER_RE.search(text))


def is_generic_sign_name(name: str) -> bool:
    if not name:
        return True
    n = name.strip()
    return n.startswith('Traffic Sign ') or n == 'Traffic Sign'


def is_khmer_primary_text(text: str) -> bool:
    if not text or not has_khmer(text):
        return False
    lower = text.lower()
    if lower.startswith('cambodia road sign '):
        return False
    if 'follow the rules indicated' in lower:
        return False
    return len(KHMER_RE.findall(text)) >= 8


def category_for_code(code: str) -> str:
    if not code:
        return 'warning'
    prefix = code[0].upper()
    if prefix == 'R' or code.upper().startswith('PW'):
        return 'prohibitory'
    if prefix == 'W':
        return 'warning'
    if prefix == 'S':
        return 'mandatory'
    if prefix in ('G', 'P'):
        return 'informative'
    return 'warning'


def _catalog_row(sign_code: str = '', class_key: str = '') -> dict | None:
    code = (sign_code or '').upper()
    ck = (class_key or '').upper()
    for row in _load_catalog_rows():
        if code and (row.get('sign_code') or '').upper() == code:
            return row
        if ck and (row.get('class_key') or '').upper() == ck:
            return row
    meta = _load_meta_rows()
    if ck and ck in meta:
        return meta[ck]
    return None


def khmer_name_from_english(name: str) -> str | None:
    lower = (name or '').strip().lower()
    if not lower:
        return None
    if lower in ENGLISH_NAME_KHMER:
        return ENGLISH_NAME_KHMER[lower]
    for key, km in ENGLISH_NAME_KHMER.items():
        if key in lower:
            return km
    return None


def _category_fallback(cat: str, code: str) -> dict[str, str]:
    label = _CATEGORY_LABELS.get(cat, _CATEGORY_LABELS['warning'])
    return {
        'description': (
            f'សញ្ញា {code} ជា{label}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា '
            'និងបញ្ជរកចរាចរតាមស្លាកដែលបានរកឃើញ។'
            if code else
            f'{label}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា។'
        ),
        'guidance': (
            f'សូមបញ្ជរកចរាចរតាមស្លាក {code} ដែលបានរកឃើញ។ រក្សាសុវត្ថិភាពចរាចរណ៍។'
            if code else
            'សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍ និងរក្សាសុវត្ថិភាពចរាចរណ៍។'
        ),
    }


def ensure_khmer_speech_fields(result: dict) -> dict:
    """Ensure sign_name, description, guidance are Khmer for TTS and UI."""
    code = result.get('sign_code') or (result.get('class_key') or '').replace('_', '-')
    if code:
        result['sign_code'] = code

    class_key = (result.get('class_key') or '').upper()
    catalog = _catalog_row(sign_code=code, class_key=class_key)
    cat = result.get('category') or (catalog or {}).get('category') or category_for_code(code)
    result['category'] = cat
    fallback = _category_fallback(cat, code)

    km_name = (result.get('sign_name_km') or '').strip()
    if not has_khmer(km_name):
        current = (result.get('sign_name') or '').strip()
        if has_khmer(current) and not is_generic_sign_name(current):
            km_name = current
        elif catalog and has_khmer(catalog.get('sign_name_km', '')):
            km_name = catalog['sign_name_km']
        else:
            from_en = khmer_name_from_english(result.get('sign_name_en') or current)
            km_name = from_en or (
                f"{_CATEGORY_LABELS.get(cat, 'ស្លាកចរាចរណ៍')} {code}".strip()
                if code else _CATEGORY_LABELS.get(cat, 'ស្លាកចរាចរណ៍')
            )
        result['sign_name_km'] = km_name

    if not has_khmer(result.get('sign_name', '')) or is_generic_sign_name(result.get('sign_name', '')):
        old = result.get('sign_name', '')
        if old and not is_generic_sign_name(old) and not result.get('sign_name_en'):
            result['sign_name_en'] = old
        result['sign_name'] = result['sign_name_km']

    if not is_khmer_primary_text(result.get('description', '')):
        if not result.get('description_en'):
            result['description_en'] = result.get('description', '')
        if catalog and has_khmer(catalog.get('description', '')):
            result['description'] = catalog['description']
        else:
            result['description'] = fallback['description']

    if not is_khmer_primary_text(result.get('guidance', '')):
        if not result.get('guidance_en'):
            result['guidance_en'] = result.get('guidance', '')
        if catalog and has_khmer(catalog.get('guidance', '')):
            result['guidance'] = catalog['guidance']
        else:
            name = result.get('sign_name_km') or result.get('sign_name', '')
            result['guidance'] = (
                f'សូមបញ្ជរកចរាចរតាមស្លាក {name}។ {fallback["guidance"]}'
                if name else fallback['guidance']
            )

    if catalog:
        if not result.get('sign_name_en') and catalog.get('sign_name_en'):
            result['sign_name_en'] = catalog['sign_name_en']
        if not result.get('description_en') and catalog.get('description_en'):
            result['description_en'] = catalog['description_en']
        if not result.get('guidance_en') and catalog.get('guidance_en'):
            result['guidance_en'] = catalog['guidance_en']

    return result


def enrich_catalog_row(row: dict) -> dict:
    merged = {
        'class_key': row.get('class_key', ''),
        'sign_code': row.get('sign_code', ''),
        'sign_name': row.get('sign_name', ''),
        'sign_name_km': row.get('sign_name_km', ''),
        'sign_name_en': row.get('sign_name_en', ''),
        'description': row.get('description', ''),
        'description_en': row.get('description_en', ''),
        'guidance': row.get('guidance', ''),
        'guidance_en': row.get('guidance_en', ''),
        'category': row.get('category', ''),
    }
    out = ensure_khmer_speech_fields(merged)
    row.update({k: out[k] for k in out if k in row or k in (
        'sign_name', 'sign_name_km', 'sign_name_en', 'description',
        'description_en', 'guidance', 'guidance_en', 'sign_code', 'category',
    )})
    return row
