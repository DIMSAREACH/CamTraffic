"""Build data/traffic_signs/import_manifest.json from ai/sign_catalog.json."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

CATALOG_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_catalog.json'
MANIFEST_PATH = Path(settings.BASE_DIR).parent / 'data' / 'traffic_signs' / 'import_manifest.json'
OVERRIDES_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_metadata_overrides.json'


def _english_name(row: dict, code: str) -> str:
    if row.get('sign_name_en'):
        return row['sign_name_en']
    desc_en = row.get('description_en') or ''
    if desc_en.startswith('Cambodia road sign'):
        return f'Traffic sign {code}'
    return row.get('sign_name', '') or f'Traffic sign {code}'


class Command(BaseCommand):
    help = 'Generate bilingual import_manifest.json for traffic sign DB import'

    def handle(self, *args, **options):
        if not CATALOG_PATH.exists():
            self.stderr.write('Missing ai/sign_catalog.json — run: cd ai && python build_dataset.py')
            return

        catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
        overrides = {}
        if OVERRIDES_PATH.exists():
            overrides = {
                k.upper().replace('_', '-'): v
                for k, v in json.loads(OVERRIDES_PATH.read_text(encoding='utf-8')).items()
            }

        manifest = []
        for row in catalog:
            code = row['sign_code']
            merged = {**row, **(overrides.get(code.upper(), {}))}
            manifest.append({
                'sign_code': code,
                'class_key': merged.get('class_key', code.replace('-', '_')),
                'category': merged['category'],
                'sign_name': merged['sign_name'],
                'sign_name_km': merged.get('sign_name_km') or merged['sign_name'],
                'sign_name_en': _english_name(merged, code),
                'description': merged['description'],
                'description_en': merged.get('description_en', ''),
                'guidance': merged.get('guidance', ''),
                'guidance_en': merged.get('guidance_en', ''),
                'image_file': f'Cambodia_road_sign_{code}.svg.png',
            })

        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Wrote {len(manifest)} signs to {MANIFEST_PATH}'
        ))
