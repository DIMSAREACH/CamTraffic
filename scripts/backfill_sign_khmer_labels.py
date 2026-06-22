"""
Apply bilingual Khmer/English labels and descriptions to the database.

Run after updating ai/sign_khmer_overrides.json or ai/sign_catalog.json.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT / 'ai'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django  # noqa: E402

django.setup()

from khmer_speech import ensure_khmer_speech_fields  # noqa: E402
from traffic_signs.models import TrafficSign  # noqa: E402

OVERRIDES_PATH = ROOT / 'ai' / 'sign_khmer_overrides.json'


def main() -> None:
    if not OVERRIDES_PATH.is_file():
        print(f'Missing {OVERRIDES_PATH}. Run the Khmer label generator first.')
        sys.exit(1)

    with open(OVERRIDES_PATH, encoding='utf-8') as fh:
        overrides: dict[str, dict[str, str]] = json.load(fh)

    updated = 0
    missing = 0
    for sign in TrafficSign.objects.all().order_by('sign_code'):
        code = (sign.sign_code or '').strip()
        labels = overrides.get(code, {})
        payload = {
            'sign_code': code,
            'category': sign.category or '',
            'sign_name': sign.sign_name,
            'sign_name_km': labels.get('km') or sign.sign_name_km or sign.sign_name,
            'sign_name_en': labels.get('en') or sign.sign_name_en or sign.sign_name,
            'description': sign.description,
            'description_en': sign.description_en,
            'guidance': sign.guidance,
            'guidance_en': sign.guidance_en,
        }
        enriched = ensure_khmer_speech_fields(payload)
        sign.sign_name = enriched.get('sign_name') or enriched['sign_name_km']
        sign.sign_name_km = enriched['sign_name_km']
        sign.sign_name_en = enriched.get('sign_name_en') or sign.sign_name_en
        sign.description = enriched['description']
        sign.description_en = enriched.get('description_en') or sign.description_en
        sign.guidance = enriched.get('guidance') or sign.guidance
        sign.guidance_en = enriched.get('guidance_en') or sign.guidance_en
        sign.save(update_fields=[
            'sign_name', 'sign_name_km', 'sign_name_en',
            'description', 'description_en', 'guidance', 'guidance_en',
        ])
        updated += 1
        if code and code not in overrides:
            missing += 1

    print(f'Updated {updated} signs with real Khmer names/descriptions')
    if missing:
        print(f'{missing} signs had no entry in {OVERRIDES_PATH.name} (used catalog/meta fallbacks)')


if __name__ == '__main__':
    main()
