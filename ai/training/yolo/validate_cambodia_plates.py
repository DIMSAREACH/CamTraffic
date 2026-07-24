#!/usr/bin/env python
"""Validate Cambodia license plate detection dataset (single-class YOLO)."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import yaml


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--data',
        type=Path,
        default=Path(__file__).resolve().parents[2]
        / 'datasets' / 'splits' / 'cambodia_license_plates' / 'data.yaml',
    )
    args = parser.parse_args()
    data = yaml.safe_load(args.data.read_text(encoding='utf-8'))
    root = Path(data['path']).resolve()
    print('=' * 70)
    print('Cambodia License Plates — Dataset Validation')
    print('=' * 70)
    print(f'Root: {root}')
    print(f'nc={data.get("nc")} names={data.get("names")}')

    errors: list[str] = []
    total_img = 0
    total_box = 0
    for split in ('train', 'valid', 'test'):
        img_dir = root / split / 'images'
        lbl_dir = root / split / 'labels'
        images = sorted(
            p for p in img_dir.iterdir()
            if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
        ) if img_dir.is_dir() else []
        boxes = 0
        for img in images:
            total_img += 1
            lbl = lbl_dir / f'{img.stem}.txt'
            if not lbl.is_file():
                errors.append(f'{split}: missing label {img.name}')
                continue
            for i, line in enumerate(lbl.read_text(encoding='utf-8').splitlines(), 1):
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                if len(parts) != 5:
                    errors.append(f'{split}/{lbl.name}:{i} need 5 fields')
                    continue
                try:
                    cls_id = int(float(parts[0]))
                    vals = [float(x) for x in parts[1:]]
                except ValueError:
                    errors.append(f'{split}/{lbl.name}:{i} bad numbers')
                    continue
                if cls_id != 0:
                    errors.append(f'{split}/{lbl.name}:{i} class must be 0')
                if any(v < 0 or v > 1 for v in vals):
                    errors.append(f'{split}/{lbl.name}:{i} bbox OOB {vals}')
                boxes += 1
                total_box += 1
        print(f'{split:6s} images={len(images):3d} boxes={boxes:3d}')

    gt_path = root / 'ocr_ground_truth.json'
    if gt_path.is_file():
        gt = json.loads(gt_path.read_text(encoding='utf-8'))
        with_plate = sum(1 for v in gt.values() if v.get('primary_plate'))
        print(f'OCR GT entries: {len(gt)} (with plate text: {with_plate})')
        samples = [v['primary_plate'] for v in gt.values() if v.get('primary_plate')][:6]
        print(f'Sample plates: {samples}')

    if errors:
        print(f'\n❌ {len(errors)} issues')
        for e in errors[:15]:
            print(f'  - {e}')
        return 1
    print(f'\n✅ Dataset 100% valid — {total_img} images, {total_box} plate boxes')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
