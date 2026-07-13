#!/usr/bin/env python
"""
Build OCR manifest from plate batch metadata (transcriptions from plate_id).

Usage:
  python ai/scripts/generate_ocr_manifest.py
  python ai/scripts/generate_ocr_manifest.py --metadata ai/datasets/processed/metadata/BATCH-REF-VEH-PLATE-001.csv
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT

OCR_DIR = DATASETS_ROOT / 'annotations' / 'ocr'
DEFAULT_META = DATASETS_ROOT / 'processed' / 'metadata' / 'BATCH-REF-VEH-PLATE-001.csv'


def normalize_plate(text: str) -> str:
    u = text.upper().replace(' ', '')
    u = re.sub(r'JPG$', '', u)
    return u


def extract_plate_id(notes: str) -> str:
    m = re.search(r'plate_id=([^;]+)', notes)
    return normalize_plate(m.group(1)) if m else ''


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate OCR transcription manifest')
    parser.add_argument('--metadata', type=Path, default=None)
    parser.add_argument('--roboflow-ocr', type=Path, default=None, help='CSV from export_roboflow_annotations plates')
    args = parser.parse_args()

    rows: list[dict] = []

    if args.roboflow_ocr:
        path = args.roboflow_ocr.resolve()
        if path.is_file():
            with path.open(encoding='utf-8') as fh:
                rows.extend(list(csv.DictReader(fh)))

    meta_path = (args.metadata or DEFAULT_META).resolve()
    if meta_path.is_file():
        with meta_path.open(encoding='utf-8') as fh:
            for row in csv.DictReader(fh):
                if not row.get('filename', '').startswith('PLATE_'):
                    continue
                plate_id = extract_plate_id(row.get('notes', ''))
                crop_src = DATASETS_ROOT / 'raw' / 'license_plates' / row['class_name'] / row['filename']
                rows.append({
                    'image_id': row['filename'],
                    'batch_id': row.get('batch_id', ''),
                    'plate_class': row.get('class_name', ''),
                    'transcription': plate_id,
                    'crop_path': str(crop_src),
                    'source': row.get('source', ''),
                    'verified': 'auto',
                    'notes': 'Seed batch',
                })

    default_robo = DATASETS_ROOT / 'processed' / 'metadata' / 'BATCH-ROBO-PLATE-001_ocr.csv'
    if default_robo.is_file():
        with default_robo.open(encoding='utf-8') as fh:
            rows.extend(list(csv.DictReader(fh)))

    if not rows:
        raise SystemExit('No OCR metadata found; run export_roboflow_annotations.py --type plates first')

    # Deduplicate by image_id
    seen: set[str] = set()
    unique_rows: list[dict] = []
    for row in rows:
        key = row.get('image_id') or row.get('transcription', '')
        if key in seen:
            continue
        seen.add(key)
        unique_rows.append(row)
    rows = unique_rows
    OCR_DIR.mkdir(parents=True, exist_ok=True)
    crops_dir = OCR_DIR / 'crops'
    crops_dir.mkdir(parents=True, exist_ok=True)

    out = OCR_DIR / 'ocr_manifest.csv'
    fields = list(rows[0].keys()) if rows else [
        'image_id', 'batch_id', 'plate_class', 'transcription', 'crop_path', 'source', 'verified', 'notes',
    ]
    with out.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    # Copy crops for OCR training folder
    import shutil
    copied = 0
    for row in rows:
        src = Path(row['crop_path'])
        if src.is_file():
            shutil.copy2(src, crops_dir / row['image_id'])
            copied += 1

    print(f'Transcriptions: {len(rows)}')
    print(f'Crops copied: {copied} → {crops_dir}')
    print(f'Manifest: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
