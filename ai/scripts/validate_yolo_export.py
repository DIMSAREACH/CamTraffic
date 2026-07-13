#!/usr/bin/env python
"""
Validate a YOLO export or split (image/label pairs, class ids, box ranges).

Usage:
  python ai/scripts/validate_yolo_export.py --export BATCH-REF-VEH-PLATE-001
  python ai/scripts/validate_yolo_export.py --dataset ai/datasets/splits/plate_number_reference_remapped
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, REPORTS_DIR, iter_images, label_path_for
from validate_dataset import parse_label

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'


def validate_root(root: Path, max_class: int | None) -> dict:
    errors: list[str] = []
    images = iter_images(root)
    for split, img in images:
        label = label_path_for(img)
        if label is None:
            errors.append(f'missing label: {img.relative_to(root)}')
            continue
        try:
            boxes = parse_label(label)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        for cls, x, y, w, h in boxes:
            if max_class is not None and (cls < 0 or cls > max_class):
                errors.append(f'class {cls} out of range in {label.name}')
            for val in (x, y, w, h):
                if val < 0 or val > 1:
                    errors.append(f'box out of range in {label.name}')

    return {
        'root': str(root),
        'images': len(images),
        'errors': errors,
        'ok': len(errors) == 0,
    }


def infer_max_class(root: Path) -> int | None:
    yaml_path = root / 'data.yaml'
    if not yaml_path.is_file():
        return None
    import re
    nc = None
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^nc:\s*(\d+)', line.strip())
        if m:
            nc = int(m.group(1))
            break
    return (nc - 1) if nc else None


def main() -> int:
    parser = argparse.ArgumentParser(description='Validate YOLO export/split')
    parser.add_argument('--export', type=Path, default=None)
    parser.add_argument('--dataset', type=Path, default=None)
    parser.add_argument('--max-class', type=int, default=None)
    args = parser.parse_args()

    if args.export:
        root = EXPORTS_ROOT / args.export
    elif args.dataset:
        root = args.dataset.resolve()
    else:
        raise SystemExit('Provide --export or --dataset')

    max_class = args.max_class if args.max_class is not None else infer_max_class(root)
    report = validate_root(root, max_class)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'validate_yolo_export_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Root: {root}')
    print(f"Images: {report['images']}")
    print(f"Errors: {len(report['errors'])}")
    print(f'Report: {out}')
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
