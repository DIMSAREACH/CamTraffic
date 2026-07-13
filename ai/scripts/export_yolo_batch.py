#!/usr/bin/env python
"""
Export a raw image batch to YOLO 1.1 layout under ai/datasets/annotations/exports/.

Supports:
  - plate crops: auto full-frame bbox from folder class (private/commercial/government)
  - existing YOLO dataset copy (signs)

Usage:
  python ai/scripts/export_yolo_batch.py --batch BATCH-REF-VEH-PLATE-001 --mode plates
  python ai/scripts/export_yolo_batch.py --batch BATCH-SIGNS-DATASET10 --mode yolo-copy --source ai/dataset_10
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

from _common import AI_ROOT, DATASETS_ROOT, IMAGE_EXTS, iter_images, label_path_for, sha256_file

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'
BATCH_LOG = DATASETS_ROOT / 'annotations' / 'annotation_batch_log.csv'


def load_class_map() -> dict:
    path = DATASETS_ROOT / 'labels' / 'yolo' / 'class-map.json'
    if not path.is_file():
        raise SystemExit('Run build_class_maps.py first')
    return json.loads(path.read_text(encoding='utf-8'))


def write_yolo_label(path: Path, class_id: int, *, cx=0.5, cy=0.5, w=0.92, h=0.92) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'{class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n', encoding='utf-8')


def export_plates(batch_id: str, *, dry_run: bool = False) -> dict:
    class_map = load_class_map()
    folder_map = class_map['plate_folder_to_class_id']
    raw_root = DATASETS_ROOT / 'raw' / 'license_plates'
    out_root = EXPORTS_ROOT / batch_id
    images_out = out_root / 'images' / 'all'
    labels_out = out_root / 'labels' / 'all'
    rows: list[dict] = []
    count = 0

    for cls_dir in sorted(raw_root.iterdir()):
        if not cls_dir.is_dir():
            continue
        class_id = folder_map.get(cls_dir.name)
        if class_id is None:
            continue
        for src in sorted(cls_dir.glob('*')):
            if src.suffix.lower() not in IMAGE_EXTS:
                continue
            dest_img = images_out / src.name
            dest_lbl = labels_out / f'{src.stem}.txt'
            if not dry_run:
                images_out.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest_img)
                write_yolo_label(dest_lbl, class_id)
            count += 1
            rows.append({'image': src.name, 'class_id': class_id, 'class_folder': cls_dir.name})

    manifest = {
        'batch_id': batch_id,
        'mode': 'plates_auto_bbox',
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'images': count,
        'export_root': str(out_root),
        'label_format': 'YOLO 1.1',
        'notes': 'Full-frame bbox for Roboflow plate crops; review in CVAT before training.',
    }
    if not dry_run:
        out_root.mkdir(parents=True, exist_ok=True)
        (out_root / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        append_batch_log(batch_id, count, 'plates_auto_bbox')
    return manifest


def export_yolo_copy(batch_id: str, source: Path, *, dry_run: bool = False) -> dict:
    source = source.resolve()
    out_root = EXPORTS_ROOT / batch_id
    count = 0
    for split, img in iter_images(source):
        label = label_path_for(img)
        if label is None:
            continue
        rel = img.relative_to(source)
        if 'images' in rel.parts:
            parts = list(rel.parts)
            idx = parts.index('images')
            parts[idx] = 'labels'
            dest_img = out_root / Path(*parts)
            dest_lbl = dest_img.with_suffix('.txt')
            dest_img = dest_img.parent.parent / 'images' / dest_img.parent.name / dest_img.name
            # normalize to images/{split}/ file
            dest_img = out_root / 'images' / split / img.name
            dest_lbl = out_root / 'labels' / split / f'{img.stem}.txt'
        else:
            dest_img = out_root / 'images' / 'all' / img.name
            dest_lbl = out_root / 'labels' / 'all' / f'{img.stem}.txt'
        if not dry_run:
            dest_img.parent.mkdir(parents=True, exist_ok=True)
            dest_lbl.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img, dest_img)
            shutil.copy2(label, dest_lbl)
        count += 1

    manifest = {
        'batch_id': batch_id,
        'mode': 'yolo_copy',
        'source': str(source),
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'images': count,
        'export_root': str(out_root),
        'label_format': 'YOLO 1.1',
    }
    if not dry_run:
        out_root.mkdir(parents=True, exist_ok=True)
        (out_root / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        append_batch_log(batch_id, count, 'yolo_copy')
    return manifest


def append_batch_log(batch_id: str, files: int, mode: str) -> None:
    BATCH_LOG.parent.mkdir(parents=True, exist_ok=True)
    write_header = not BATCH_LOG.is_file() or BATCH_LOG.stat().st_size == 0
    with BATCH_LOG.open('a', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow(['batch_id', 'mode', 'files', 'exported_at', 'export_path'])
        writer.writerow([
            batch_id,
            mode,
            files,
            datetime.now(timezone.utc).isoformat(),
            str(EXPORTS_ROOT / batch_id),
        ])


def main() -> int:
    parser = argparse.ArgumentParser(description='Export YOLO annotation batch')
    parser.add_argument('--batch', required=True, help='Batch id e.g. BATCH-REF-VEH-PLATE-001')
    parser.add_argument('--mode', choices=('plates', 'yolo-copy'), default='plates')
    parser.add_argument('--source', type=Path, default=AI_ROOT / 'dataset_10')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if args.mode == 'plates':
        manifest = export_plates(args.batch, dry_run=args.dry_run)
    else:
        manifest = export_yolo_copy(args.batch, args.source, dry_run=args.dry_run)

    print(f"Batch: {manifest['batch_id']}")
    print(f"Images: {manifest['images']}")
    print(f"Export: {manifest['export_root']}")
    if args.dry_run:
        print('Dry run — no files written')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
