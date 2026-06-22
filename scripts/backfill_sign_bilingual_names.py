"""
Backfill sign_name_km and sign_name_en for catalog signs.
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django  # noqa: E402

django.setup()

from traffic_signs.models import TrafficSign  # noqa: E402

KHMER_RE = re.compile(r'[\u1780-\u17FF]')
META_JSON = ROOT / 'ai' / 'reference_sign_meta.json'

MANUAL = {
    'GIVE-WAY': ('ផ្តល់ផ្លូវ', 'Yield (Give way)'),
    'KH-YIELD': ('ផ្តល់ផ្លូវ', 'Yield (Give way)'),
    'STOP': ('ឈប់', 'Stop'),
    'KH-STOP': ('ឈប់', 'Stop'),
    'KH-ROUND': ('រង្វង់មូលខាងមុខ', 'Roundabout ahead'),
    'KH-NO-ENTRY': ('ហាមចូល', 'No entry'),
    'NO-ENTRY': ('ហាមចូល', 'No entry'),
    'NO-ENTRY-FOR-MOTORCYCLE': ('ហាមចូលម៉ូតូ', 'No entry for motorcycles'),
    'KH-ONEWAY': ('ផ្លូវដោយឯកទៅ', 'One-way traffic'),
    'KH-SP40': ('កំណត់ល្បឿន ៤០', 'Speed limit 40 km/h'),
    'KH-SP60': ('កំណត់ល្បឿន ៦០', 'Speed limit 60 km/h'),
    'SCHOOL-ZONE': ('តំបន់សាលា', 'School zone'),
    'SPEED-LIMIT-40': ('កំណត់ល្បឿន ៤០', 'Speed limit 40 km/h'),
    'R1-01': ('ហាមបត់ឆ្វេង', 'No left turn'),
    'KH-NOPARK': ('ហាមឈរចត', 'No parking'),
    'KH-NOUT': ('ហាមបត់ក', 'No U-turn'),
    'KH-PED': ('ផ្លូវអ្នកថ្មើរជើង', 'Pedestrian crossing'),
}


def main():
    with open(META_JSON, encoding='utf-8') as fh:
        meta = json.load(fh)
    by_code = {entry['sign_code']: entry for entry in meta.values() if entry.get('sign_code')}

    updated_meta = 0
    updated_manual = 0

    for sign in TrafficSign.objects.all().order_by('sign_code'):
        if sign.sign_code in MANUAL:
            km, en = MANUAL[sign.sign_code]
            sign.sign_name_km = km
            sign.sign_name_en = en
            sign.sign_name = km
            sign.save(update_fields=['sign_name_km', 'sign_name_en', 'sign_name'])
            updated_manual += 1
            continue

        entry = by_code.get(sign.sign_code)
        if not entry:
            continue

        km = (entry.get('sign_name_km') or '').strip()
        en = (entry.get('sign_name_en') or '').strip()
        use_km = km if KHMER_RE.search(km) else ''
        use_en = en or (km if km and not KHMER_RE.search(km) else '')

        fields = []
        if use_km and sign.sign_name_km != use_km:
            sign.sign_name_km = use_km
            fields.append('sign_name_km')
        if use_en and sign.sign_name_en != use_en:
            sign.sign_name_en = use_en
            fields.append('sign_name_en')
        if use_km and sign.sign_name != use_km:
            sign.sign_name = use_km
            fields.append('sign_name')
        if fields:
            sign.save(update_fields=fields)
            updated_meta += 1

    print(f'Updated from meta: {updated_meta}')
    print(f'Updated manual codes: {updated_manual}')
    print(f'Remaining missing km: {TrafficSign.objects.filter(sign_name_km="").count()}')
    print(f'Remaining missing en: {TrafficSign.objects.filter(sign_name_en="").count()}')


if __name__ == '__main__':
    main()
