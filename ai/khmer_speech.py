"""Khmer display and TTS text for Cambodia traffic signs (all codes)."""
from __future__ import annotations

import re

KHMER_RE = re.compile(r'[\u1780-\u17FF]')

CATEGORY_SPEECH = {
    'prohibitory': {
        'label': 'ស្លាកហាមចរាចរណ៍',
        'description': (
            'នេះជាស្លាកហាមដែលហាមឱ្យអ្នកបើកបរធ្វើសកម្មភាពមួយចំនួន។ '
            'សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា និងមិនធ្វើអត្តអត្តដែលស្លាកបង្ហាញ។'
        ),
        'guidance': (
            'សូមកុំធ្វើអត្តអត្តដែលស្លាកនេះហាមប្រាមាណ៌។ '
            'បន្តដំណើរតាមផ្លូវដែលអនុញ្ញាត និងរក្សាសុវត្ថិភាពចរាចរណ៍។'
        ),
    },
    'warning': {
        'label': 'ស្លាកព្រមានចរាចរណ៍',
        'description': (
            'នេះជាស្លាកព្រមានអំពីគ្រោះថ្នាក់ ឬស្ថានភាពផ្លូវខាងមុខ។ '
            'សូមប្រុងប្រយ័ត្ន និងត្រៀមខ្លួនបើកបរសុវត្ថិភាព។'
        ),
        'guidance': (
            'សូមបន្ថយល្បឿន មើលផ្លូវឱ្យបានល្អ និងបើកបរតាមស្លាកព្រមាននេះ។'
        ),
    },
    'mandatory': {
        'label': 'ស្លាកបញ្ជាចរាចរណ៍',
        'description': (
            'នេះជាស្លាកបញ្ជាឱ្យអ្នកបើកបរត្រូវធ្វើតាមដែលបង្ហាញ។ '
            'ការមិនអនុវត្តអាចបង្កគ្រោះថ្នាក់ ឬប្រឈមមានការផាកពិន័យ។'
        ),
        'guidance': (
            'សូមអនុវត្តតាមទិសដៅ ឬល្បឿនដែលស្លាកបញ្ជា។ '
            'រក្សាចរណ្តម្មមជាមួយចរាចរផ្សេងទៀត។'
        ),
    },
    'informative': {
        'label': 'ស្លាកផ្តល់ព័ត៌មាន',
        'description': (
            'នេះជាស្លាកផ្តល់ព័ត៌មានអំពីផ្លូវ ទីតាំង ឬសេវាកម្ម។ '
            'សូមអានស្លាកឱ្យបានច្បាស់មុនបើកបរបន្ត។'
        ),
        'guidance': (
            'សូមបញ្ជរកចរាចរតាមព័ត៌មានដែលស្លាកបង្ហាញ។ '
            'បន្ថយល្បឿនបើមានស្ថានភាពផ្លូវពិសេស។'
        ),
    },
}

# Common English catalog / mock names → Khmer
ENGLISH_NAME_KHMER = {
    'stop sign': 'ស្លាកឈប់',
    'stop': 'ស្លាកឈប់',
    'no entry': 'ហាមចូល',
    'no left turn': 'ហាមបត់ឆ្វេង',
    'no right turn': 'ហាមបត់ស្តាំ',
    'no u-turn': 'ហាមបត់កោដ្ឋ',
    'no parking': 'ហាមចត់',
    'speed limit': 'កំណត់ល្បឿន',
    'yield': 'ផ្តល់ផ្លូវ',
    'give way': 'ផ្តល់ផ្លូវ',
    'pedestrian crossing': 'ផ្លូវឆ្លងថ្នល់ជើរ',
    'one way': 'ផ្លូវដោយឡែក',
    'roundabout': 'រង្វង់ផ្ទុះ',
}


def has_khmer(text: str) -> bool:
    return bool(text and KHMER_RE.search(text))


def is_generic_sign_name(name: str) -> bool:
    if not name:
        return True
    n = name.strip()
    return n.startswith('Traffic Sign ') or n == f'Traffic Sign'


def is_khmer_primary_text(text: str) -> bool:
    """True when text is mainly Khmer (not catalog English with one Khmer word)."""
    if not text or not has_khmer(text):
        return False
    lower = text.lower()
    if lower.startswith('cambodia road sign '):
        return False
    if 'follow the rules indicated' in lower:
        return False
    # Khmer should be a large share of content
    khmer_chars = len(KHMER_RE.findall(text))
    return khmer_chars >= 8


def category_for_code(code: str) -> str:
    if not code:
        return 'warning'
    prefix = code[0].upper()
    if prefix == 'R':
        return 'prohibitory'
    if prefix == 'W':
        return 'warning'
    if prefix == 'S':
        return 'mandatory'
    if prefix in ('G', 'P'):
        return 'informative'
    return 'warning'


def khmer_name_from_english(name: str) -> str | None:
    lower = name.lower()
    for key, km in ENGLISH_NAME_KHMER.items():
        if key in lower:
            return km
    return None


def ensure_khmer_speech_fields(result: dict) -> dict:
    """
    Ensure sign_name, description, guidance are Khmer for TTS and UI.
    Preserves detailed overrides (e.g. R1-01) when already in Khmer.
    """
    code = result.get('sign_code') or (result.get('class_key') or '').replace('_', '-')
    if code:
        result['sign_code'] = code

    cat = result.get('category') or category_for_code(code)
    tpl = CATEGORY_SPEECH.get(cat, CATEGORY_SPEECH['warning'])

    # --- Sign name (Khmer) ---
    km_name = result.get('sign_name_km') or ''
    if not has_khmer(km_name):
        current = result.get('sign_name', '')
        if has_khmer(current) and not is_generic_sign_name(current):
            km_name = current
        else:
            from_en = khmer_name_from_english(
                result.get('sign_name_en') or current,
            )
            km_name = from_en or (
                f"{tpl['label']} {code}" if code else tpl['label']
            )
        result['sign_name_km'] = km_name

    # Primary display name = Khmer
    if not has_khmer(result.get('sign_name', '')) or is_generic_sign_name(
        result.get('sign_name', ''),
    ):
        old = result.get('sign_name', '')
        if old and not is_generic_sign_name(old) and not result.get('sign_name_en'):
            result['sign_name_en'] = old
        elif old and is_generic_sign_name(old) and not result.get('sign_name_en'):
            en = khmer_name_from_english(old)
            if en:
                result['sign_name_en'] = en
        result['sign_name'] = result['sign_name_km']

    # --- Description ---
    if not is_khmer_primary_text(result.get('description', '')):
        if not result.get('description_en'):
            result['description_en'] = result.get('description', '')
        desc = tpl['description']
        if code:
            desc = f"ស្លាកលេខ {code}។ {desc}"
        result['description'] = desc

    # --- Guidance ---
    if not is_khmer_primary_text(result.get('guidance', '')):
        if not result.get('guidance_en'):
            result['guidance_en'] = result.get('guidance', '')
        guide = tpl['guidance']
        name = result.get('sign_name_km') or result.get('sign_name', '')
        if name:
            guide = f"សូមបញ្ជរកចរាចរតាមស្លាក {name}។ {guide}"
        result['guidance'] = guide

    return result


def enrich_catalog_row(row: dict) -> dict:
    """Apply Khmer speech fields to a sign_catalog.json row (in place)."""
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
    row['sign_name'] = out['sign_name']
    row['sign_name_km'] = out.get('sign_name_km', out['sign_name'])
    if out.get('sign_name_en'):
        row['sign_name_en'] = out['sign_name_en']
    row['description'] = out['description']
    if out.get('description_en'):
        row['description_en'] = out['description_en']
    row['guidance'] = out['guidance']
    if out.get('guidance_en'):
        row['guidance_en'] = out['guidance_en']
    return row
