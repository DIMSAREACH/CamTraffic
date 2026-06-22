#!/usr/bin/env python
"""
Retain only the 10-class thesis catalog in the database, with reference images from:
  Reference(PDF Download)/Dim Sareach/Road signs in Cambodia/

Steps:
  1. Import metadata from traffic_sign_catalog_10.json
  2. Replace images from reference PNGs (Prohibitory / Priority / Warning / Information)
  3. Copy processed art to ai/catalog_10_signs and ai/custom_signs
  4. Remove all other TrafficSign rows (248 -> 10)
  5. Update ai/weights/training_status.json sign_codes to thesis short codes

Usage (from repo root):
  python scripts/retain_catalog_10_signs.py
  python scripts/retain_catalog_10_signs.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
CATALOG_PATH = ROOT / 'ai' / 'traffic_sign_catalog_10.json'
TRAINING_STATUS_PATH = ROOT / 'ai' / 'weights' / 'training_status.json'
CUSTOM_SIGNS_DIR = ROOT / 'ai' / 'custom_signs'

sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from ai_detection.sign_catalog_loader import CLASS_OFFICIAL_CODES, normalize_catalog_row
from traffic_signs.models import TrafficSign


def load_catalog_signs() -> list[dict]:
    payload = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    rows = payload.get('signs') if isinstance(payload, dict) else payload
    if not isinstance(rows, list) or len(rows) != 10:
        raise SystemExit('traffic_sign_catalog_10.json must contain exactly 10 signs')
    return [normalize_catalog_row(row) for row in rows]


def retain_codes(rows: list[dict]) -> set[str]:
    codes: set[str] = set()
    for row in rows:
        if row.get('sign_code'):
            codes.add(row['sign_code'].upper())
        official = row.get('official_sign_code') or CLASS_OFFICIAL_CODES.get(row['class_key'], '')
        if official:
            codes.add(official.upper())
    return codes


def update_training_status(rows: list[dict], *, dry_run: bool) -> None:
    if not TRAINING_STATUS_PATH.is_file():
        return
    status = json.loads(TRAINING_STATUS_PATH.read_text(encoding='utf-8'))
    status['sign_codes'] = [row['sign_code'] for row in rows]
    status['class_keys'] = [row['class_key'] for row in rows]
    status['yolo_class_count'] = 10
    status['dataset'] = 'dataset_10'
    if dry_run:
        print(f'[dry-run] would update {TRAINING_STATUS_PATH.name} sign_codes -> thesis short codes')
        return
    TRAINING_STATUS_PATH.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {TRAINING_STATUS_PATH.name} sign_codes ({len(rows)} thesis signs)')


def sync_custom_signs(rows: list[dict], *, dry_run: bool) -> None:
    archive_dir = ROOT / 'ai' / 'catalog_10_signs'
    if not archive_dir.is_dir():
        print('Skip custom_signs — run image sync first (catalog_10_signs missing)')
        return

    if dry_run:
        print(f'[dry-run] would refresh {CUSTOM_SIGNS_DIR} from catalog_10_signs')
        return

    CUSTOM_SIGNS_DIR.mkdir(parents=True, exist_ok=True)
    for old in CUSTOM_SIGNS_DIR.glob('Cambodia_road_sign*.png'):
        old.unlink()

    copied = 0
    for row in rows:
        short = row['sign_code'].replace('-', '_')
        matches = sorted(archive_dir.glob(f'{short}_*.png'))
        if not matches:
            continue
        src = matches[0]
        official = row.get('official_sign_code') or CLASS_OFFICIAL_CODES.get(row['class_key'], row['sign_code'])
        for code in {row['sign_code'], official}:
            dest = CUSTOM_SIGNS_DIR / f'Cambodia_road_sign_{code}.svg.png'
            shutil.copy2(src, dest)
            copied += 1
    print(f'Refreshed ai/custom_signs ({copied} files)')


def prune_database(rows: list[dict], *, dry_run: bool) -> None:
    keep = retain_codes(rows)
    all_codes = list(TrafficSign.objects.values_list('sign_code', flat=True))
    extra = [code for code in all_codes if (code or '').upper() not in keep]

    print(f'Database: {len(all_codes)} sign(s) -> retain {len(rows)} thesis class(es)')
    print(f'  Remove: {len(extra)} extra sign(s)')

    if dry_run:
        for code in sorted(extra)[:15]:
            print(f'    [dry-run] delete {code}')
        if len(extra) > 15:
            print(f'    ... and {len(extra) - 15} more')
        return

    if extra:
        keep_list = [row['sign_code'] for row in rows]
        deleted, _ = TrafficSign.objects.exclude(sign_code__in=keep_list).delete()
        print(f'Deleted {deleted} row(s) from traffic_signs')

    remaining = TrafficSign.objects.count()
    print(f'Database now has {remaining} sign(s)')


def main() -> None:
    parser = argparse.ArgumentParser(description='Retain 10-class thesis catalog with Cambodia reference images')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--skip-images', action='store_true')
    args = parser.parse_args()

    if not CATALOG_PATH.is_file():
        raise SystemExit('Missing ai/traffic_sign_catalog_10.json')

    rows = load_catalog_signs()

    import_cmd = [
        sys.executable,
        str(BACKEND / 'manage.py'),
        'import_traffic_sign_catalog_10',
        f'--catalog={CATALOG_PATH}',
    ]
    print('Importing thesis catalog metadata...')
    if not args.dry_run:
        subprocess.run(import_cmd, cwd=BACKEND, check=True)

    if not args.skip_images:
        img_cmd = [sys.executable, str(ROOT / 'scripts' / 'sync_catalog_10_reference_images.py')]
        if args.dry_run:
            img_cmd.append('--dry-run')
        print('Syncing reference images from Road signs in Cambodia...')
        subprocess.run(img_cmd, cwd=ROOT, check=True)

    sync_custom_signs(rows, dry_run=args.dry_run)
    prune_database(rows, dry_run=args.dry_run)
    update_training_status(rows, dry_run=args.dry_run)

    if not args.dry_run:
        from ai_detection.services import _refresh_catalog_media_hashes, _refresh_custom_sign_hashes
        from ai_detection.sign_catalog_loader import invalidate_catalog_cache

        invalidate_catalog_cache()
        _refresh_catalog_media_hashes()
        _refresh_custom_sign_hashes()

    print('Done. Refresh Traffic Signs / AI Detection in the browser.')


if __name__ == '__main__':
    main()
