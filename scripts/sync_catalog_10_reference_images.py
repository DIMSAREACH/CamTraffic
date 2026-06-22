#!/usr/bin/env python
"""
Replace the 10-class thesis sign images with reference art from:
  Reference(PDF Download)/Dim Sareach/Road signs in Cambodia/

Prohibitory signs (7): No entry, turns, parking, speed limits
Priority signs (1): Stop
Warning signs (1): Pedestrian crossing
Information signs (1): One-way traffic

Usage (from repo root):
  python scripts/sync_catalog_10_reference_images.py
  python scripts/sync_catalog_10_reference_images.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
CATALOG_PATH = ROOT / 'ai' / 'traffic_sign_catalog_10.json'
META_PATH = ROOT / 'ai' / 'reference_sign_meta.json'
CATALOG_10_IMAGES = ROOT / 'ai' / 'catalog_10_signs'
DEFAULT_REFERENCE_ROOT = Path(
    r'D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Road signs in Cambodia'
)

sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.core.files.base import ContentFile
from PIL import Image

from ai_detection.sign_catalog_loader import normalize_catalog_row
from traffic_signs.models import TrafficSign
from traffic_signs.management.commands.sync_ai_training import _encode_sign_image
from traffic_signs.management.commands.import_traffic_sign_catalog_10 import Command as ImportCatalog10Command


def load_meta() -> dict[str, dict]:
    if not META_PATH.is_file():
        return {}
    return json.loads(META_PATH.read_text(encoding='utf-8'))


def find_reference_image(row: dict, meta: dict[str, dict], reference_root: Path) -> Path | None:
    class_key = row.get('class_key', '')
    source_folder = row.get('source_folder') or (meta.get(class_key) or {}).get('source_folder', '')
    source_file = row.get('source_file') or (meta.get(class_key) or {}).get('source_file', '')
    if source_folder and source_file:
        direct = reference_root / source_folder / source_file
        if direct.is_file():
            return direct
    if source_file:
        name_lower = source_file.lower()
        for path in reference_root.rglob('*'):
            if path.is_file() and path.name.lower() == name_lower:
                return path
    return None


def find_db_sign(row: dict) -> TrafficSign | None:
    finder = ImportCatalog10Command()
    return finder._find_existing_sign(row)


def main() -> None:
    parser = argparse.ArgumentParser(description='Sync 10-class catalog images from Cambodia reference folder')
    parser.add_argument('--reference-root', type=Path, default=DEFAULT_REFERENCE_ROOT)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if not CATALOG_PATH.is_file():
        raise SystemExit('Missing ai/traffic_sign_catalog_10.json')
    if not args.reference_root.is_dir():
        raise SystemExit(f'Reference folder not found: {args.reference_root}')

    payload = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    signs = payload.get('signs') if isinstance(payload, dict) else payload
    if not isinstance(signs, list):
        raise SystemExit('Invalid catalog format')

    meta = load_meta()
    CATALOG_10_IMAGES.mkdir(parents=True, exist_ok=True)

    updated = 0
    missing = 0
    for raw in signs:
        row = normalize_catalog_row(raw)
        class_key = row['class_key']
        short_code = row['sign_code']
        source_path = find_reference_image(row, meta, args.reference_root)
        if not source_path:
            print(f'  [MISSING] {class_key} ({short_code}) — no reference image')
            missing += 1
            continue

        archive_name = f'{short_code.replace("-", "_")}_{source_path.stem}.png'
        archive_path = CATALOG_10_IMAGES / archive_name

        sign = find_db_sign(row)
        if not sign:
            print(f'  [NO DB] {class_key} ({short_code}) — run import_traffic_sign_catalog_10 first')
            missing += 1
            continue

        print(f'  [OK] {short_code:6} {class_key:28} <- {source_path.parent.name}/{source_path.name}')

        if args.dry_run:
            continue

        with Image.open(source_path) as raw_img:
            png_data = _encode_sign_image(raw_img)

        archive_path.write_bytes(png_data)
        sign.image.save(f'{short_code}.png', ContentFile(png_data), save=True)
        updated += 1

    print()
    print(f'Reference root : {args.reference_root}')
    print(f'Archive folder : {CATALOG_10_IMAGES}')
    print(f'Images updated : {updated}')
    print(f'Missing/skipped: {missing}')
    if updated and not args.dry_run:
        from ai_detection.services import _refresh_custom_sign_hashes

        _refresh_custom_sign_hashes()
        print('Refreshed detection image hash cache.')


if __name__ == '__main__':
    main()
