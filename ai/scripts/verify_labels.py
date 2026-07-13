#!/usr/bin/env python
"""
Verify YOLO label class IDs against class-map.json and optionally refresh data.yaml.

Usage:
  python ai/scripts/verify_labels.py --dataset ai/datasets/splits/plate_number_reference_remapped
  python ai/scripts/verify_labels.py --dataset ai/dataset_10 --update-yaml
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, REPORTS_DIR, iter_images, label_path_for
from validate_dataset import parse_label


def load_class_map() -> dict:
    path = DATASETS_ROOT / 'labels' / 'yolo' / 'class-map.json'
    return json.loads(path.read_text(encoding='utf-8'))


def update_yaml(dataset: Path, names: dict[int, str]) -> None:
    yaml_path = dataset / 'data.yaml'
    lines = [
        f'# Verified {datetime.now(timezone.utc).isoformat()}',
        f'path: {dataset.resolve().as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        f'nc: {len(names)}',
        'names:',
    ]
    for idx in sorted(names):
        lines.append(f'  {idx}: {names[idx]}')
    yaml_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser(description='Verify label class IDs')
    parser.add_argument('--dataset', type=Path, required=True)
    parser.add_argument('--update-yaml', action='store_true')
    args = parser.parse_args()

    dataset = args.dataset.resolve()
    class_map = load_class_map()
    all_names = {int(k): v for k, v in class_map['names'].items()}

    yaml_path = dataset / 'data.yaml'
    if yaml_path.is_file():
        max_class = None
        for line in yaml_path.read_text(encoding='utf-8').splitlines():
            m = re.match(r'^nc:\s*(\d+)', line.strip())
            if m:
                max_class = int(m.group(1)) - 1
                break
        allowed = set(range(max_class + 1)) if max_class is not None else set(all_names)
    else:
        allowed = set(all_names)

    seen: Counter[int] = Counter()
    errors: list[str] = []
    for _split, img in iter_images(dataset):
        label = label_path_for(img)
        if label is None:
            continue
        for cls, *_rest in parse_label(label):
            seen[cls] += 1
            if cls not in allowed:
                errors.append(f'class {cls} not in allowed set for {label.name}')

    names = {k: all_names.get(k, f'class_{k}') for k in sorted(seen)}

    if args.update_yaml and names:
        update_yaml(dataset, names)

    report = {
        'dataset': str(dataset),
        'allowed_classes': sorted(allowed),
        'seen_classes': dict(seen),
        'errors': errors,
        'ok': len(errors) == 0,
    }
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'verify_labels_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Dataset: {dataset}')
    print(f'Classes seen: {dict(seen)}')
    print(f'Errors: {len(errors)}')
    if args.update_yaml:
        print(f'Updated: {dataset / "data.yaml"}')
    print(f'Report: {out}')
    return 0 if not errors else 1


if __name__ == '__main__':
    raise SystemExit(main())
