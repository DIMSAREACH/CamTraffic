"""Import the 10-class thesis catalog into TrafficSign rows."""
from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from ai_detection.sign_catalog_loader import normalize_catalog_row, official_sign_code_for_row
from traffic_signs.models import TrafficSign

DEFAULT_CATALOG = Path(settings.BASE_DIR).parent / 'ai' / 'traffic_sign_catalog_10.json'


class Command(BaseCommand):
    help = 'Import ai/traffic_sign_catalog_10.json (10-class thesis catalog) into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--catalog',
            default=str(DEFAULT_CATALOG),
            help='Path to traffic_sign_catalog_10.json',
        )

    def _find_existing_sign(self, row: dict) -> TrafficSign | None:
        short_code = (row.get('sign_code') or '').strip()
        official_code = official_sign_code_for_row(row)
        class_key = (row.get('class_key') or '').strip()

        for code in (short_code, official_code):
            if code:
                sign = TrafficSign.objects.filter(sign_code__iexact=code).first()
                if sign:
                    return sign

        if class_key:
            return TrafficSign.objects.filter(sign_code__iexact=class_key.replace('_', '-')).first()
        return None

    def handle(self, *args, **options):
        catalog_path = Path(options['catalog'])
        if not catalog_path.is_file():
            self.stderr.write(self.style.ERROR(f'Missing catalog: {catalog_path}'))
            return

        payload = json.loads(catalog_path.read_text(encoding='utf-8'))
        rows = payload.get('signs') if isinstance(payload, dict) else payload
        if not isinstance(rows, list):
            self.stderr.write(self.style.ERROR('Catalog must be a list or {"signs": [...]}'))
            return

        created = updated = 0
        for raw in rows:
            row = normalize_catalog_row(raw)
            short_code = (row.get('sign_code') or '').strip()
            if not short_code:
                self.stderr.write(self.style.WARNING(f"Skipping row without sign_code: {row.get('class_key')}"))
                continue

            defaults = {
                'sign_code': short_code,
                'sign_name': row.get('sign_name_km') or row.get('sign_name_en', short_code),
                'sign_name_km': row.get('sign_name_km', ''),
                'sign_name_en': row.get('sign_name_en', ''),
                'description': row.get('description_km') or row.get('description', ''),
                'description_en': row.get('description_en', ''),
                'guidance': row.get('guidance', ''),
                'guidance_en': row.get('guidance_en', ''),
                'category': row.get('category', 'warning'),
            }

            existing = self._find_existing_sign(row)
            if existing:
                for field, value in defaults.items():
                    setattr(existing, field, value)
                existing.save()
                updated += 1
            else:
                TrafficSign.objects.create(**defaults)
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Catalog 10 import complete: {created} created, {updated} updated ({len(rows)} rows).'
            )
        )
