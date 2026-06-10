"""Import Cambodia sign catalog from ai/sign_catalog.json and reference images."""
import json
import shutil
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from traffic_signs.models import TrafficSign
from traffic_signs.sign_image_utils import is_placeholder_sign_image

CATALOG_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_catalog.json'
MANIFEST_PATH = Path(settings.BASE_DIR).parent / 'data' / 'traffic_signs' / 'import_manifest.json'
REFERENCE_DIR = (
    Path(settings.BASE_DIR).parent.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'ស្លាកសញ្ញាចរាចរណ៏'
)


def find_image_for_code(sign_code: str) -> Path | None:
    if not REFERENCE_DIR.is_dir():
        return None
    code = sign_code.replace('_', '-')
    patterns = [
        f'Cambodia_road_sign_{code}.svg.png',
        f'Cambodia_road_sign_{code}*.png',
    ]
    for pat in patterns:
        matches = sorted(REFERENCE_DIR.glob(pat))
        if matches:
            return matches[0]
    return None


class Command(BaseCommand):
    help = 'Import Cambodia traffic signs from ai/sign_catalog.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing signs with same sign_code',
        )
        parser.add_argument(
            '--replace-placeholders',
            action='store_true',
            help='Replace green-circle placeholder images with reference art when available',
        )

    def _load_rows(self):
        if MANIFEST_PATH.exists():
            return json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
        if CATALOG_PATH.exists():
            return json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
        return None

    def handle(self, *args, **options):
        data = self._load_rows()
        if not data:
            self.stderr.write(
                'Run: python manage.py build_sign_import_manifest '
                'or cd ai && python build_dataset.py'
            )
            return
        created = updated = 0
        overrides_path = Path(settings.BASE_DIR).parent / 'ai' / 'sign_metadata_overrides.json'
        overrides = {}
        if overrides_path.exists():
            overrides = {
                k.upper().replace('_', '-'): v
                for k, v in json.loads(overrides_path.read_text(encoding='utf-8')).items()
            }

        for row in data:
            code = row['sign_code']
            merged = {**row, **(overrides.get(code.upper(), {}))}
            defaults = {
                'sign_name': merged['sign_name'],
                'sign_name_km': merged.get('sign_name_km') or merged['sign_name'],
                'sign_name_en': merged.get('sign_name_en', ''),
                'category': merged['category'],
                'description': merged['description'],
                'description_en': merged.get('description_en', ''),
                'guidance': merged.get('guidance', ''),
                'guidance_en': merged.get('guidance_en', ''),
            }
            sign, was_created = TrafficSign.objects.get_or_create(
                sign_code=code,
                defaults=defaults,
            )
            if was_created:
                created += 1
            elif options['update']:
                for k, v in defaults.items():
                    setattr(sign, k, v)
                sign.save()
                updated += 1

            img_path = find_image_for_code(code)
            if not img_path or not img_path.is_file():
                continue
            if is_placeholder_sign_image(img_path):
                continue

            current_path = Path(sign.image.path) if sign.image else None
            needs_image = not sign.image
            replace_placeholder = (
                options['replace_placeholders']
                and current_path
                and current_path.is_file()
                and is_placeholder_sign_image(current_path)
            )
            if needs_image or replace_placeholder:
                with open(img_path, 'rb') as f:
                    sign.image.save(f'{code}.png', File(f), save=True)

        self.stdout.write(self.style.SUCCESS(
            f'Catalog import done: {created} created, {updated} updated, {len(data)} total in JSON'
        ))
