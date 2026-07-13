#!/usr/bin/env python
"""
Validate YOLO dataset integrity: image/label pairs, class ids, box ranges.

Usage:
  python ai/scripts/validate_dataset.py --dataset ai/dataset_10
  python ai/scripts/validate_dataset.py --dataset ai/dataset --data-yaml ai/data.yaml
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, MANIFESTS_DIR, REPORTS_DIR, iter_images, label_path_for, load_yaml_names


def parse_label(path: Path) -> list[tuple[int, float, float, float, float]]:
    rows: list[tuple[int, float, float, float, float]] = []
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 5:
            raise ValueError(f'Bad label line in {path.name}: {line!r}')
        cls = int(parts[0])
        coords = tuple(float(x) for x in parts[1:])
        rows.append((cls, *coords))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description='YOLO dataset validation')
    parser.add_argument('--dataset', type=Path, default=AI_ROOT / 'dataset_10')
    parser.add_argument('--data-yaml', type=Path, default=None)
    args = parser.parse_args()

    dataset = args.dataset.resolve()
    yaml_path = args.data_yaml or (dataset / 'data.yaml')
    if not yaml_path.is_file():
        yaml_path = AI_ROOT / 'data.yaml'
    names = load_yaml_names(yaml_path)
    max_class = max(names) if names else 0

    errors: list[str] = []
    warnings: list[str] = []
    images = iter_images(dataset)

    label_files = set()
    for split, img in images:
        label = label_path_for(img)
        if label is None:
            errors.append(f'missing label for {img.relative_to(dataset)}')
            continue
        label_files.add(label)
        try:
            boxes = parse_label(label)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        for cls, x, y, w, h in boxes:
            if cls < 0 or cls > max_class:
                errors.append(f'class {cls} out of range in {label.name}')
            for val in (x, y, w, h):
                if val < 0 or val > 1:
                    errors.append(f'normalized box out of range in {label.name}')

    report = {
        'dataset': str(dataset),
        'data_yaml': str(yaml_path),
        'images': len(images),
        'classes': len(names),
        'errors': errors,
        'warnings': warnings,
        'ok': len(errors) == 0,
    }

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'validate_dataset_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Dataset: {dataset}')
    print(f'Images: {report["images"]}')
    print(f'Errors: {len(errors)}')
    print(f'Warnings: {len(warnings)}')
    print(f'Report: {out}')
    return 0 if not errors else 1


if __name__ == '__main__':
    raise SystemExit(main())
