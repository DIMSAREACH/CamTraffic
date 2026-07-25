"""Restore traffic-sign catalog images from local Cambodia reference art.

R2 public URLs for sign images are currently 403 / missing. This command copies
reference PNGs into MEDIA_ROOT/signs/ and rebinds TrafficSign.image so the SPA
can load them via the Vite /media proxy.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from traffic_signs.models import TrafficSign

REPO_ROOT = getattr(settings, 'REPO_ROOT', None) or Path(settings.BASE_DIR).resolve().parents[1]
REPO_AI = Path(REPO_ROOT) / 'ai'
META_PATH = REPO_AI / 'reference_sign_meta.json'
REFERENCE_DIRS = [
    REPO_AI / 'datasets' / 'external' / 'cambodia_sign_reference',
    REPO_AI / 'datasets' / 'external' / 'Road signs in Cambodia',
]


def _norm(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (text or '').lower())


def _index_reference_files() -> dict[str, Path]:
    index: dict[str, Path] = {}
    for root in REFERENCE_DIRS:
        if not root.is_dir():
            continue
        for path in root.rglob('*'):
            if path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.avif'}:
                continue
            index[_norm(path.name)] = path
            index[_norm(path.stem)] = path
    return index


class Command(BaseCommand):
    help = 'Copy Cambodia reference sign images into MEDIA_ROOT and rebind TrafficSign.image'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing local files even if already present',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Optional max signs to restore (0 = all)',
        )

    def handle(self, *args, **options):
        if not META_PATH.is_file():
            self.stderr.write(f'Missing meta: {META_PATH}')
            return

        meta = json.loads(META_PATH.read_text(encoding='utf-8'))
        by_code: dict[str, dict] = {}
        for row in meta.values():
            code = (row.get('sign_code') or '').strip().upper().replace('_', '-')
            if code:
                by_code[code] = row

        ref_index = _index_reference_files()
        if not ref_index:
            self.stderr.write('No reference images found under cambodia_sign_reference')
            return

        dest_dir = Path(settings.MEDIA_ROOT) / 'signs'
        dest_dir.mkdir(parents=True, exist_ok=True)

        restored = skipped = missing = 0
        qs = TrafficSign.objects.all().order_by('sign_code')
        if options['limit']:
            qs = qs[: options['limit']]

        for sign in qs:
            code = (sign.sign_code or '').strip().upper().replace('_', '-')
            row = by_code.get(code) or {}
            source_file = (row.get('source_file') or '').strip()
            src: Path | None = None
            if source_file:
                src = ref_index.get(_norm(source_file)) or ref_index.get(_norm(Path(source_file).stem))
            if src is None:
                for key in (
                    sign.sign_name_en,
                    sign.sign_name,
                    row.get('sign_name_en'),
                    code,
                ):
                    if key and _norm(str(key)) in ref_index:
                        src = ref_index[_norm(str(key))]
                        break
            if src is None or not src.is_file():
                missing += 1
                continue

            dest_name = f'signs/{code}.png'
            dest = Path(settings.MEDIA_ROOT) / dest_name
            if dest.is_file() and not options['force']:
                # Still ensure DB points at local path
                if (sign.image.name or '') != dest_name:
                    sign.image.name = dest_name
                    sign.save(update_fields=['image'])
                    restored += 1
                else:
                    skipped += 1
                continue

            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.suffix.lower() == '.png':
                shutil.copy2(src, dest)
            else:
                # Normalize non-PNG to PNG via Pillow when available
                try:
                    from PIL import Image

                    Image.open(src).convert('RGBA').save(dest, format='PNG')
                except Exception:
                    shutil.copy2(src, dest.with_suffix(src.suffix))
                    dest_name = f'signs/{code}{src.suffix.lower()}'
                    dest = Path(settings.MEDIA_ROOT) / dest_name

            sign.image.name = dest_name
            sign.save(update_fields=['image'])
            restored += 1
            self.stdout.write(f'  ✓ {code} ← {src.name}')

        self.stdout.write(self.style.SUCCESS(
            f'Restored {restored} sign image(s); skipped {skipped}; missing reference {missing}'
        ))
        self.stdout.write(f'Local media: {dest_dir}')
