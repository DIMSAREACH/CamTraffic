#!/usr/bin/env python
"""
Export labeled Roboflow YOLO datasets to ai/datasets/annotations/exports/.

Usage:
  python ai/scripts/export_roboflow_annotations.py --type vehicles --batch BATCH-ROBO-VEH-001
  python ai/scripts/export_roboflow_annotations.py --type plates --batch BATCH-ROBO-PLATE-001
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

from _common import DATASETS_ROOT, IMAGE_EXTS, MANIFESTS_DIR
from import_roboflow_zip import DEFAULT_ROBOFLOW, infer_plate_class, load_roboflow_names, map_roboflow_vehicle

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'
BATCH_LOG = DATASETS_ROOT / 'annotations' / 'annotation_batch_log.csv'

VEHICLE_LOCAL = ['bus', 'sedan', 'motorcycle', 'truck', 'scooter']
PLATE_LOCAL = ['plate_private', 'plate_commercial', 'plate_government']
PLATE_LOCAL_INDEX = {'private': 0, 'commercial': 1, 'government': 2}


def roboflow_vehicle_local_id(roboflow_names: dict[int, str], cls_id: int) -> int:
    name = roboflow_names.get(cls_id, 'car')
    mapped = map_roboflow_vehicle(name)
    order = {'bus': 0, 'sedan': 1, 'motorcycle': 2, 'truck': 3, 'scooter': 4}
    return order.get(mapped, 1)


def extract_plate_transcription(stem: str) -> str:
    u = stem.upper()
    m = re.match(r'^([A-Z0-9]+-[A-Z0-9]+)', u)
    if m:
        return m.group(1)
    m = re.match(r'^([A-Z0-9-]+?)_JPG', u)
    return m.group(1) if m else stem.split('_')[0].upper()


def remap_label_lines(text: str, remap_fn) -> str:
    lines = []
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split()
        cls = int(parts[0])
        parts[0] = str(remap_fn(cls))
        lines.append(' '.join(parts))
    return '\n'.join(lines) + ('\n' if lines else '')


def find_pairs(root: Path) -> list[tuple[Path, Path, str]]:
    pairs: list[tuple[Path, Path, str]] = []
    for split in ('train', 'valid', 'test'):
        img_dir = root / split / 'images'
        lbl_dir = root / split / 'labels'
        if not img_dir.is_dir():
            continue
        for img in sorted(img_dir.rglob('*')):
            if not img.is_file() or img.suffix.lower() not in IMAGE_EXTS:
                continue
            lbl = lbl_dir / f'{img.stem}.txt'
            if lbl.is_file():
                pairs.append((img, lbl, split))
    return pairs


def append_batch_log(batch_id: str, files: int, mode: str) -> None:
    BATCH_LOG.parent.mkdir(parents=True, exist_ok=True)
    write_header = not BATCH_LOG.is_file() or BATCH_LOG.stat().st_size == 0
    with BATCH_LOG.open('a', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow(['batch_id', 'mode', 'files', 'exported_at', 'export_path'])
        writer.writerow([
            batch_id, mode, files,
            datetime.now(timezone.utc).isoformat(),
            str(EXPORTS_ROOT / batch_id),
        ])


def export_vehicles(source: Path, batch_id: str) -> dict:
    roboflow_names = load_roboflow_names(source)
    out_root = EXPORTS_ROOT / batch_id
    count = 0
    by_class: dict[str, int] = {}

    for img, lbl, split in find_pairs(source):
        dest_img = out_root / 'images' / split / img.name
        dest_lbl = out_root / 'labels' / split / lbl.name
        dest_img.parent.mkdir(parents=True, exist_ok=True)
        dest_lbl.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img, dest_img)
        text = lbl.read_text(encoding='utf-8')

        def remap(cls: int) -> int:
            return roboflow_vehicle_local_id(roboflow_names, cls)

        dest_lbl.write_text(remap_label_lines(text, remap), encoding='utf-8')
        count += 1
        for line in text.splitlines():
            if line.strip():
                cid = roboflow_vehicle_local_id(roboflow_names, int(line.split()[0]))
                name = VEHICLE_LOCAL[cid] if cid < len(VEHICLE_LOCAL) else 'sedan'
                by_class[name] = by_class.get(name, 0) + 1

    manifest = {
        'batch_id': batch_id,
        'mode': 'roboflow_labeled',
        'source': str(source),
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'images': count,
        'boxes_by_class': by_class,
        'classes': VEHICLE_LOCAL,
        'export_root': str(out_root),
    }
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    append_batch_log(batch_id, count, 'roboflow_labeled_vehicles')
    return manifest


def export_plates(source: Path, batch_id: str) -> dict:
    out_root = EXPORTS_ROOT / batch_id
    ocr_rows: list[dict] = []
    count = 0
    by_class: dict[str, int] = {}

    for img, lbl, split in find_pairs(source):
        plate_cls = infer_plate_class(img.stem)
        local_id = PLATE_LOCAL_INDEX[plate_cls]
        dest_img = out_root / 'images' / split / img.name
        dest_lbl = out_root / 'labels' / split / lbl.name
        dest_img.parent.mkdir(parents=True, exist_ok=True)
        dest_lbl.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img, dest_img)
        text = lbl.read_text(encoding='utf-8')
        dest_lbl.write_text(remap_label_lines(text, lambda _cls: local_id), encoding='utf-8')
        count += 1
        by_class[plate_cls] = by_class.get(plate_cls, 0) + 1
        transcription = extract_plate_transcription(img.stem)
        ocr_rows.append({
            'image_id': img.name,
            'batch_id': batch_id,
            'plate_class': plate_cls,
            'transcription': transcription,
            'crop_path': str(dest_img),
            'source': f'roboflow/{split}',
            'verified': 'roboflow',
            'notes': '',
        })

    manifest = {
        'batch_id': batch_id,
        'mode': 'roboflow_labeled',
        'source': str(source),
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'images': count,
        'by_class': by_class,
        'classes': PLATE_LOCAL,
        'export_root': str(out_root),
    }
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    append_batch_log(batch_id, count, 'roboflow_labeled_plates')

    meta_path = DATASETS_ROOT / 'processed' / 'metadata' / f'{batch_id}_ocr.csv'
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    if ocr_rows:
        with meta_path.open('w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(fh, fieldnames=list(ocr_rows[0].keys()))
            writer.writeheader()
            writer.writerows(ocr_rows)

    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description='Export labeled Roboflow annotations')
    parser.add_argument('--type', choices=('vehicles', 'plates'), required=True)
    parser.add_argument('--batch', required=True)
    parser.add_argument('--folder', type=Path, default=None)
    args = parser.parse_args()

    source = (args.folder or DEFAULT_ROBOFLOW[args.type]).resolve()
    if not source.is_dir():
        raise SystemExit(f'Roboflow folder not found: {source}')

    if args.type == 'vehicles':
        manifest = export_vehicles(source, args.batch)
    else:
        manifest = export_plates(source, args.batch)

    print(f"Batch: {manifest['batch_id']}")
    print(f"Images: {manifest['images']}")
    print(f"Export: {manifest['export_root']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
