"""Import one traffic sign by code from ai/sign_metadata_overrides.json."""
import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from traffic_signs.models import TrafficSign

OVERRIDES_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_metadata_overrides.json'
CUSTOM_SIGNS_DIR = Path(settings.BASE_DIR).parent / 'ai' / 'custom_signs'


class Command(BaseCommand):
    help = 'Import or update a single sign by code (metadata + optional image)'

    def add_arguments(self, parser):
        parser.add_argument('sign_code', type=str, help='e.g. PW03-R1-01')
        parser.add_argument(
            '--image',
            type=str,
            default='',
            help='Path to PNG; default: ai/custom_signs/Cambodia_road_sign_{code}.svg.png',
        )

    def handle(self, *args, **options):
        code = options['sign_code'].strip().upper().replace('_', '-')
        if not OVERRIDES_PATH.exists():
            self.stderr.write('Missing ai/sign_metadata_overrides.json')
            return

        overrides = json.loads(OVERRIDES_PATH.read_text(encoding='utf-8'))
        meta = overrides.get(code)
        if not meta:
            self.stderr.write(f'No metadata for {code} in sign_metadata_overrides.json')
            return

        defaults = {
            'sign_name': meta.get('sign_name_km') or meta.get('sign_name', code),
            'sign_name_km': meta.get('sign_name_km') or meta.get('sign_name', ''),
            'sign_name_en': meta.get('sign_name_en', ''),
            'category': meta.get('category', 'prohibitory'),
            'description': meta.get('description', ''),
            'description_en': meta.get('description_en', ''),
            'guidance': meta.get('guidance', ''),
            'guidance_en': meta.get('guidance_en', ''),
        }
        sign, created = TrafficSign.objects.update_or_create(sign_code=code, defaults=defaults)

        img_path = Path(options['image']) if options['image'] else (
            CUSTOM_SIGNS_DIR / f'Cambodia_road_sign_{code}.svg.png'
        )
        if img_path.is_file():
            with open(img_path, 'rb') as f:
                sign.image.save(f'{code}.png', File(f), save=True)

        verb = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'{verb} sign {code} (id={sign.id})'))
