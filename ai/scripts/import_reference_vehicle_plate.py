#!/usr/bin/env python
"""
Import Dim Sareach vehicle / plate reference batch into ai/datasets/raw/.

Usage:
  python ai/scripts/import_reference_vehicle_plate.py
  python ai/scripts/import_reference_vehicle_plate.py --source "D:/path/to/Vichicle Detect"
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, MANIFESTS_DIR, REPORTS_DIR, sha256_file
from dim_sareach_paths import vehicle_detect_root

DEFAULT_SOURCE = vehicle_detect_root()
BATCH_ID = 'BATCH-REF-VEH-PLATE-001'

PLATE_SOURCES = ('Plate_Number', 'Vichicle&PlateNumber')
VEHICLE_SOURCES = ('Vichicle',)

COMMERCIAL_PREFIXES = ('BTM', 'KPS', 'KPT')
GOVERNMENT_PREFIXES = ('GV', 'GOV', 'POL', 'MIL', 'ROYAL')


def extract_plate_id(filename: str) -> str:
    stem = Path(filename).stem
    m = re.match(r'^([A-Z0-9]+-[A-Z0-9]+)', stem.upper())
    if m:
        return m.group(1)
    m = re.match(r'^([A-Z0-9-]+?)_JPG', stem.upper())
    return m.group(1) if m else stem.split('_')[0]


def classify_plate(plate_id: str) -> str:
    u = plate_id.upper().replace(' ', '')
    for prefix in GOVERNMENT_PREFIXES:
        if u.startswith(prefix):
            return 'government'
    for prefix in COMMERCIAL_PREFIXES:
        if u.startswith(prefix):
            return 'commercial'
    # Series letter patterns sometimes used for commercial fleets in provincial codes
    if re.match(r'^[A-Z]{2,3}2[CDFGH]', u):
        return 'commercial'
    return 'private'


def next_seq(root: Path, prefix: str) -> int:
    existing = list(root.glob(f'{prefix}_*.*'))
    nums = []
    for p in existing:
        m = re.search(r'_(\d+)\.', p.name)
        if m:
            nums.append(int(m.group(1)))
    return max(nums, default=0) + 1


def existing_hashes(*roots: Path) -> set[str]:
    seen: set[str] = set()
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob('*'):
            if path.is_file() and path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}:
                seen.add(sha256_file(path))
    return seen


def import_batch(source_root: Path, *, dry_run: bool = False) -> dict:
    plate_root = DATASETS_ROOT / 'raw' / 'license_plates'
    vehicle_root = DATASETS_ROOT / 'raw' / 'vehicles' / 'urban'
    meta_rows: list[dict] = []
    imported_plates = 0
    imported_vehicles = 0
    skipped = 0
    plate_by_class: dict[str, int] = {'private': 0, 'commercial': 0, 'government': 0}
    seen_hashes = existing_hashes(plate_root, vehicle_root, DATASETS_ROOT / 'raw' / 'vehicles')

    for sub in PLATE_SOURCES:
        src_dir = source_root / sub
        if not src_dir.is_dir():
            continue
        for src in sorted(src_dir.glob('*.jpg')):
            digest = sha256_file(src)
            if digest in seen_hashes:
                skipped += 1
                continue
            seen_hashes.add(digest)
            plate_id = extract_plate_id(src.name)
            plate_class = classify_plate(plate_id)
            seq = next_seq(plate_root / plate_class, f'PLATE_{plate_class.upper()}')
            dest_name = f'PLATE_{plate_class.upper()}_{seq:06d}{src.suffix.lower()}'
            dest = plate_root / plate_class / dest_name
            if not dry_run:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
            plate_by_class[plate_class] += 1
            imported_plates += 1
            meta_rows.append({
                'image_id': dest_name,
                'batch_id': BATCH_ID,
                'class_name': plate_class,
                'source': f'reference/{sub}',
                'province': 'Phnom Penh' if plate_id.startswith('PP') else 'Cambodia',
                'gps_lat': '',
                'gps_lon': '',
                'weather': 'clear',
                'time_of_day': 'day',
                'captured_at': datetime.now(timezone.utc).isoformat(),
                'filename': dest_name,
                'notes': f'plate_id={plate_id}; original={src.name}',
            })

    for sub in VEHICLE_SOURCES:
        src_dir = source_root / sub
        if not src_dir.is_dir():
            continue
        for src in sorted(src_dir.glob('*.jpg')):
            digest = sha256_file(src)
            if digest in seen_hashes:
                skipped += 1
                continue
            seen_hashes.add(digest)
            seq = next_seq(vehicle_root, 'VEHICLE_URBAN')
            dest_name = f'VEHICLE_URBAN_{seq:06d}{src.suffix.lower()}'
            dest = vehicle_root / dest_name
            if not dry_run:
                vehicle_root.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
            imported_vehicles += 1
            meta_rows.append({
                'image_id': dest_name,
                'batch_id': BATCH_ID,
                'class_name': 'urban_scene',
                'source': f'reference/{sub}',
                'province': 'Phnom Penh',
                'gps_lat': '',
                'gps_lon': '',
                'weather': 'clear',
                'time_of_day': 'day',
                'captured_at': datetime.now(timezone.utc).isoformat(),
                'filename': dest_name,
                'notes': f'Phnom Penh street frame; original={src.name}',
            })

    if not dry_run and meta_rows:
        meta_path = DATASETS_ROOT / 'processed' / 'metadata' / f'{BATCH_ID}.csv'
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        fields = list(meta_rows[0].keys())
        with meta_path.open('w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(fh, fieldnames=fields)
            writer.writeheader()
            writer.writerows(meta_rows)

        log_path = DATASETS_ROOT / 'raw' / 'import_log.csv'
        write_header = not log_path.is_file() or log_path.stat().st_size == 0
        with log_path.open('a', newline='', encoding='utf-8') as fh:
            writer = csv.writer(fh)
            if write_header:
                writer.writerow(['batch_id', 'source', 'files', 'imported_at', 'notes'])
            writer.writerow([
                BATCH_ID,
                str(source_root),
                imported_plates + imported_vehicles,
                datetime.now(timezone.utc).isoformat(),
                f'plates={imported_plates}, vehicles={imported_vehicles}',
            ])

    manifest = {
        'batch_id': BATCH_ID,
        'source': str(source_root),
        'imported_at': datetime.now(timezone.utc).isoformat(),
        'license_plates': {
            'total': imported_plates,
            'by_class': plate_by_class,
        },
        'vehicles': {
            'total': imported_vehicles,
            'note': 'Phnom Penh urban scene frames (unlabeled vehicle type)',
        },
        'skipped_duplicates': skipped,
        'metadata_csv': str(DATASETS_ROOT / 'processed' / 'metadata' / f'{BATCH_ID}.csv'),
    }

    if not dry_run:
        MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
        out = MANIFESTS_DIR / f'{BATCH_ID}.json'
        out.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        (REPORTS_DIR / f'import_{BATCH_ID}_{stamp}.json').write_text(
            json.dumps(manifest, indent=2), encoding='utf-8',
        )

    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description='Import reference vehicle/plate batch')
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_dir():
        raise SystemExit(f'Source not found: {source}')

    manifest = import_batch(source, dry_run=args.dry_run)
    print(f'Source: {source}')
    print(f"Plates imported: {manifest['license_plates']['total']}")
    print(f"  by class: {manifest['license_plates']['by_class']}")
    print(f"Vehicles imported: {manifest['vehicles']['total']}")
    if manifest.get('skipped_duplicates'):
        print(f"Skipped (already imported): {manifest['skipped_duplicates']}")
    if args.dry_run:
        print('Dry run — no files copied')
    else:
        print(f"Manifest: {MANIFESTS_DIR / f'{BATCH_ID}.json'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
