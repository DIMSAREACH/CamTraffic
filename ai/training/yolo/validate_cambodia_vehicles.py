#!/usr/bin/env python
"""Validate Cambodia Traffic Vehicles dataset (YOLO labels + class balance)."""
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

import yaml

NAMES = ['Bus', 'Car', 'Moto', 'Truck', 'Tuk Tuk']


def _validate_split(root: Path, split: str) -> tuple[int, int, Counter, list[str]]:
    img_dir = root / split / 'images'
    lbl_dir = root / split / 'labels'
    errors: list[str] = []
    class_counts: Counter = Counter()
    images = sorted(
        p for p in img_dir.iterdir()
        if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
    ) if img_dir.is_dir() else []
    paired = 0
    for img in images:
        lbl = lbl_dir / f'{img.stem}.txt'
        if not lbl.is_file():
            errors.append(f'{split}: missing label for {img.name}')
            continue
        paired += 1
        for line_no, line in enumerate(lbl.read_text(encoding='utf-8').splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) != 5:
                errors.append(f'{split}/{lbl.name}:{line_no} expected 5 fields, got {len(parts)}')
                continue
            try:
                cls_id = int(float(parts[0]))
                vals = [float(x) for x in parts[1:]]
            except ValueError:
                errors.append(f'{split}/{lbl.name}:{line_no} non-numeric values')
                continue
            if cls_id < 0 or cls_id >= len(NAMES):
                errors.append(f'{split}/{lbl.name}:{line_no} class {cls_id} out of range')
                continue
            if any(v < 0 or v > 1 for v in vals):
                errors.append(f'{split}/{lbl.name}:{line_no} bbox out of [0,1]: {vals}')
                continue
            class_counts[NAMES[cls_id]] += 1
    return len(images), paired, class_counts, errors


def main() -> int:
    parser = argparse.ArgumentParser(description='Validate Cambodia Traffic Vehicles dataset')
    parser.add_argument(
        '--data',
        type=Path,
        default=Path(__file__).resolve().parents[2]
        / 'datasets' / 'splits' / 'cambodia_traffic_vehicles' / 'data.yaml',
    )
    args = parser.parse_args()
    data = yaml.safe_load(args.data.read_text(encoding='utf-8'))
    root = Path(data['path']).resolve()
    print('=' * 70)
    print('Cambodia Traffic Vehicles — Dataset Validation')
    print('=' * 70)
    print(f'Root: {root}')
    print(f'Classes ({data.get("nc")}): {list(data.get("names", {}).values()) if isinstance(data.get("names"), dict) else data.get("names")}')
    print()

    all_errors: list[str] = []
    total_imgs = 0
    total_boxes = Counter()
    for split in ('train', 'valid', 'test'):
        n_img, n_pair, counts, errors = _validate_split(root, split)
        total_imgs += n_img
        total_boxes.update(counts)
        all_errors.extend(errors)
        print(f'{split:6s}  images={n_img:4d}  paired_labels={n_pair:4d}  boxes={sum(counts.values()):4d}')
        for name in NAMES:
            if counts[name]:
                print(f'         {name:8s}: {counts[name]}')

    print()
    print(f'Total images: {total_imgs}')
    print('Class distribution (all splits):')
    for name in NAMES:
        print(f'  {name:8s}: {total_boxes[name]}')

    # Empty-label images are allowed in YOLO; report only real errors
    if all_errors:
        print(f'\n❌ {len(all_errors)} issue(s):')
        for e in all_errors[:20]:
            print(f'  - {e}')
        if len(all_errors) > 20:
            print(f'  ... and {len(all_errors) - 20} more')
        return 1

    if total_imgs < 50:
        print('\n⚠️  Small dataset — fine for bootstrap, expand for stronger production mAP')
    print('\n✅ Dataset 100% valid — ready for YOLOv8 training')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
