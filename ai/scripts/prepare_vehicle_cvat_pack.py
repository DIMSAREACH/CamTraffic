#!/usr/bin/env python
"""
Stage raw vehicle frames for CVAT annotation (images only).

Usage:
  python ai/scripts/prepare_vehicle_cvat_pack.py
"""
from __future__ import annotations

import csv
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, IMAGE_EXTS

BATCH_ID = 'BATCH-VEHICLES-PENDING'
OUT = DATASETS_ROOT / 'annotations' / 'cvat_tasks' / BATCH_ID
BATCH_LOG = DATASETS_ROOT / 'annotations' / 'annotation_batch_log.csv'


def main() -> int:
    raw_root = DATASETS_ROOT / 'raw' / 'vehicles'
    images_out = OUT / 'images'
    images_out.mkdir(parents=True, exist_ok=True)
    count = 0
    for src in sorted(raw_root.rglob('*')):
        if src.is_file() and src.suffix.lower() in IMAGE_EXTS:
            shutil.copy2(src, images_out / src.name)
            count += 1

    readme = OUT / 'README.txt'
    readme.write_text(
        'CVAT task pack — vehicle type bounding boxes\n'
        f'Images: {count}\n'
        'Labels: annotate with classes from labels/yolo/class-map.json (vehicle group)\n'
        'Export: YOLO 1.1 → ai/datasets/annotations/imports/BATCH-VEHICLES-001/\n',
        encoding='utf-8',
    )

    BATCH_LOG.parent.mkdir(parents=True, exist_ok=True)
    write_header = not BATCH_LOG.is_file() or BATCH_LOG.stat().st_size == 0
    with BATCH_LOG.open('a', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow(['batch_id', 'mode', 'files', 'exported_at', 'export_path'])
        writer.writerow([
            BATCH_ID,
            'cvat_pending',
            count,
            datetime.now(timezone.utc).isoformat(),
            str(OUT),
        ])

    print(f'CVAT pack: {OUT}')
    print(f'Images staged: {count}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
