"""Khmer display and TTS text for Cambodia traffic signs."""
from __future__ import annotations

import json
import re
from pathlib import Path

KHMER_RE = re.compile(r'[\u1780-\u17FF]')
ROOT = Path(__file__).resolve().parent
META_PATH = ROOT / 'reference_sign_meta.json'
CATALOG_PATH = ROOT / 'sign_catalog.json'
OVERRIDES_PATH = ROOT / 'sign_khmer_overrides.json'

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
    if not CATALOG_PATH.is_file():
        return []
    try:
        data = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def _load_khmer_overrides() -> dict[str, dict[str, str]]:
    if not OVERRIDES_PATH.is_file():
        return {}
    try:
        data = json.loads(OVERRIDES_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


KHMER_OVERRIDES = _load_khmer_overrides()


def _build_english_name_khmer() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in _load_catalog_rows():
        en = (row.get('sign_name_en') or row.get('sign_name') or '').strip().lower()
        km = (row.get('sign_name_km') or '').strip()
        if en and km and KHMER_RE.search(km):
            mapping[en] = km
    for row in _load_meta_rows().values():
        en = (row.get('sign_name_en') or row.get('sign_name') or '').strip().lower()
        km = (row.get('sign_name_km') or '').strip()
        if en and km and KHMER_RE.search(km):
            mapping[en] = km
    for labels in KHMER_OVERRIDES.values():
        en = (labels.get('en') or '').strip().lower()
        km = (labels.get('km') or '').strip()
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


def is_generic_khmer_label(name: str, code: str = '') -> bool:
    """True when Khmer text is only a category + sign code, not a real sign name."""
    text = (name or '').strip()
    if not text or not has_khmer(text):
        return False
    upper_code = (code or '').upper()
    if upper_code and upper_code in text.upper():
        if text.startswith('សញ្ញា') or text.startswith('ស្លាក'):
            return True
        for label in _CATEGORY_LABELS.values():
            if text.startswith(label) and upper_code in text.upper():
                return True
    return bool(re.match(r'^សញ្ញា\s+[A-Z]+-\d+', text))


def _override_labels(sign_code: str) -> dict[str, str] | None:
    code = (sign_code or '').upper()
    if not code:
        return None
    row = KHMER_OVERRIDES.get(code)
    if not row:
        return None
    km = (row.get('km') or '').strip()
    en = (row.get('en') or '').strip()
    if not km or not has_khmer(km):
        return None
    return {'km': km, 'en': en}


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
    return None


def _meta_row(sign_code: str = '', class_key: str = '') -> dict | None:
    code = (sign_code or '').upper()
    ck = (class_key or '').upper()
    meta = _load_meta_rows()
    if code:
        for row in meta.values():
            if (row.get('sign_code') or '').upper() == code:
                return row
    if ck and ck in meta:
        return meta[ck]
    return None


def _english_category_label(category: str) -> str:
    return {
        'prohibitory': 'prohibitory',
        'warning': 'warning',
        'mandatory': 'mandatory',
        'informative': 'informative',
    }.get(category, 'traffic')


def _khmer_subject(category: str, km_name: str) -> str:
    km = (km_name or '').strip()
    if not km:
        return _CATEGORY_LABELS.get(category, 'ស្លាកចរាចរណ៍')
    if km.startswith('សញ្ញា') or km.startswith('ស្លាក'):
        return km
    label = _CATEGORY_LABELS.get(category, 'ស្លាកចរាចរណ៍')
    if category == 'warning':
        return f'សញ្ញាព្រមាន{km}'
    if category == 'prohibitory':
        return f'សញ្ញាហាមឃាត់ {km}'
    if category == 'mandatory':
        return f'សញ្ញាបញ្ជា {km}'
    if category == 'informative':
        return f'សញ្ញាផ្តល់ព័ត៌មាន {km}'
    return km


def compose_khmer_description(km_name: str, category: str) -> str:
    subject = _khmer_subject(category, km_name)
    if category == 'warning':
        return f'{subject}។ សូមបន្ថយល្បឿន និងប្រុងប្រយ័ត្នចំពោះគ្រោះថ្នាក់ខាងមុខ។'
    if category == 'prohibitory':
        return f'{subject}។ សូមគោរពច្បាប់ហាមឃាត់ និងច្បាប់ចរាចរណ៍កម្ពុជា។'
    if category == 'mandatory':
        return f'{subject}។ ត្រូវបំពេញតាមសញ្ញាបញ្ជានេះ។'
    if category == 'informative':
        return f'{subject}។ សញ្ញានេះផ្តល់ព័ត៌មានចរាចរណ៍ដល់អ្នកបើកបរ។'
    return f'{subject}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា។'


def compose_khmer_guidance(km_name: str, category: str) -> str:
    km = (km_name or '').strip() or 'ស្លាកចរាចរណ៍'
    if category == 'warning':
        return f'សូមបន្ថយល្បឿន និងបញ្ជរកចរាចរតាមស្លាក {km}។ រក្សាសុវត្ថិភាពចរាចរណ៍។'
    if category == 'prohibitory':
        return f'សូមគោរពច្បាប់ហាមឃាត់ {km}។ កុំលំឡាក់ច្បាប់ចរាចរណ៍។'
    if category == 'mandatory':
        return f'សូមបំពេញតាមសញ្ញាបញ្ជា {km}។'
    if category == 'informative':
        return f'សូមអានសញ្ញា {km} និងបញ្ជរកចរាចរតាមព័ត៌មានដែលបានបង្ហាញ។'
    return f'សូមបញ្ជរកចរាចរតាមស្លាក {km}។ រក្សាសុវត្ថិភាពចរាចរណ៍។'


def compose_english_description(en_name: str, category: str) -> str:
    name = (en_name or '').strip() or 'Traffic sign'
    return f'{name} — {_english_category_label(category)} sign used on Cambodian roads.'


def compose_english_guidance(en_name: str, category: str) -> str:
    name = (en_name or '').strip() or 'this traffic sign'
    if category == 'warning':
        return f'Slow down and be prepared for the hazard: {name}.'
    if category == 'prohibitory':
        return f'Obey this prohibition: {name}.'
    if category == 'mandatory':
        return f'Follow this mandatory instruction: {name}.'
    if category == 'informative':
        return f'Use this information while driving: {name}.'
    return f'Follow this traffic sign guidance: {name}.'


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


def _pick_khmer_text(*candidates: str, code: str = '') -> str:
    for text in candidates:
        value = (text or '').strip()
        if value and is_khmer_primary_text(value) and not is_generic_khmer_label(value, code):
            return value
    return ''


def _pick_english_text(*candidates: str) -> str:
    for text in candidates:
        value = (text or '').strip()
        if value and not has_khmer(value):
            return value
    return ''


def ensure_khmer_speech_fields(result: dict) -> dict:
    """Ensure sign_name, description, guidance are Khmer for TTS and UI."""
    code = result.get('sign_code') or (result.get('class_key') or '').replace('_', '-')
    if code:
        result['sign_code'] = code

    class_key = (result.get('class_key') or '').upper()
    catalog = _catalog_row(sign_code=code, class_key=class_key) or {}
    meta = _meta_row(sign_code=code, class_key=class_key) or {}
    cat = result.get('category') or catalog.get('category') or meta.get('category') or category_for_code(code)
    result['category'] = cat
    override = _override_labels(code)

    km_name = (result.get('sign_name_km') or '').strip()
    if override and (not has_khmer(km_name) or is_generic_khmer_label(km_name, code)):
        km_name = override['km']
    elif not has_khmer(km_name):
        current = (result.get('sign_name') or '').strip()
        if has_khmer(current) and not is_generic_sign_name(current) and not is_generic_khmer_label(current, code):
            km_name = current
        else:
            km_name = _pick_khmer_text(
                meta.get('sign_name_km', ''),
                catalog.get('sign_name_km', ''),
                khmer_name_from_english(result.get('sign_name_en') or current or catalog.get('sign_name_en', '')) or '',
                code=code,
            ) or (
                f"{_CATEGORY_LABELS.get(cat, 'ស្លាកចរាចរណ៍')} {code}".strip()
                if code else _CATEGORY_LABELS.get(cat, 'ស្លាកចរាចរណ៍')
            )
    elif is_generic_khmer_label(km_name, code) and override:
        km_name = override['km']
    result['sign_name_km'] = km_name

    en_name = _pick_english_text(
        override['en'] if override else '',
        result.get('sign_name_en', ''),
        catalog.get('sign_name_en', ''),
        meta.get('sign_name_en', ''),
        result.get('sign_name', ''),
        catalog.get('sign_name', ''),
        meta.get('sign_name', ''),
    )
    if en_name:
        result['sign_name_en'] = en_name

    if not has_khmer(result.get('sign_name', '')) or is_generic_sign_name(result.get('sign_name', '')):
        old = (result.get('sign_name') or '').strip()
        if old and not is_generic_sign_name(old) and not has_khmer(old) and not result.get('sign_name_en'):
            result['sign_name_en'] = old
        result['sign_name'] = result['sign_name_km']

    desc = (result.get('description') or '').strip()
    if not is_khmer_primary_text(desc) or is_generic_khmer_label(desc, code):
        if not result.get('description_en'):
            result['description_en'] = result.get('description', '')
        picked_desc = _pick_khmer_text(meta.get('description', ''), catalog.get('description', ''), code=code)
        result['description'] = picked_desc or compose_khmer_description(km_name, cat)

    guide = (result.get('guidance') or '').strip()
    if not is_khmer_primary_text(guide) or is_generic_khmer_label(guide, code):
        if not result.get('guidance_en'):
            result['guidance_en'] = result.get('guidance', '')
        picked_guide = _pick_khmer_text(meta.get('guidance', ''), catalog.get('guidance', ''), code=code)
        result['guidance'] = picked_guide or compose_khmer_guidance(km_name, cat)

    if not _pick_english_text(result.get('description_en', '')):
        result['description_en'] = _pick_english_text(
            meta.get('description_en', ''),
            catalog.get('description_en', ''),
            result.get('description_en', ''),
        ) or compose_english_description(result.get('sign_name_en', ''), cat)

    if not _pick_english_text(result.get('guidance_en', '')):
        result['guidance_en'] = _pick_english_text(
            meta.get('guidance_en', ''),
            catalog.get('guidance_en', ''),
            result.get('guidance_en', ''),
        ) or compose_english_guidance(result.get('sign_name_en', ''), cat)

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


def export_khmer_overrides(catalog_rows: list[dict] | None = None) -> dict[str, dict[str, str]]:
    """Build sign_khmer_overrides.json content for every catalog sign."""
    rows = catalog_rows if catalog_rows is not None else _load_catalog_rows()
    overrides: dict[str, dict[str, str]] = {}
    for row in rows:
        enriched = enrich_catalog_row(dict(row))
        code = (enriched.get('sign_code') or '').strip()
        km = (enriched.get('sign_name_km') or '').strip()
        en = (enriched.get('sign_name_en') or '').strip()
        if not code or not km or not en or not has_khmer(km):
            continue
        overrides[code] = {'km': km, 'en': en}
    return overrides


def sync_reference_meta_from_catalog(catalog_rows: list[dict] | None = None) -> dict[str, dict]:
    """Merge bilingual labels into reference_sign_meta.json entries."""
    rows = catalog_rows if catalog_rows is not None else _load_catalog_rows()
    meta = _load_meta_rows()
    if not meta:
        return meta

    by_code = {(r.get('sign_code') or '').upper(): r for r in rows if r.get('sign_code')}
    by_class = {(r.get('class_key') or '').upper(): r for r in rows if r.get('class_key')}

    for key, entry in meta.items():
        code = (entry.get('sign_code') or '').upper()
        ck = (entry.get('class_key') or key or '').upper()
        source = by_code.get(code) or by_class.get(ck)
        if not source:
            continue
        enriched = enrich_catalog_row(dict(source))
        for field in (
            'sign_code', 'sign_name', 'sign_name_km', 'sign_name_en',
            'description', 'description_en', 'guidance', 'guidance_en', 'category',
        ):
            if enriched.get(field):
                entry[field] = enriched[field]
        if enriched.get('class_key'):
            entry['class_key'] = enriched['class_key']
    return meta
