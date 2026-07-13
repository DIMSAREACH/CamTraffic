#!/usr/bin/env python
"""
Split a YOLO export into train/val/test (70/20/10) under ai/datasets/splits/.

Usage:
  python ai/scripts/split_dataset.py --export BATCH-REF-VEH-PLATE-001 --output plate_number_reference_remapped
  python ai/scripts/split_dataset.py --export BATCH-SIGNS-DATASET10 --output cambodia_traffic_reference_remapped
"""
from __future__ import annotations

import argparse
import json
import random
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, IMAGE_EXTS

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'
SPLITS_ROOT = DATASETS_ROOT / 'splits'

TRAIN_RATIO = 0.70
VAL_RATIO = 0.20


def collect_pairs(export_root: Path) -> list[tuple[Path, Path]]:
    pairs: list[tuple[Path, Path]] = []
    images_root = export_root / 'images'
    labels_root = export_root / 'labels'
    for img in sorted(images_root.rglob('*')):
        if not img.is_file() or img.suffix.lower() not in IMAGE_EXTS:
            continue
        rel = img.relative_to(images_root)
        label = labels_root / rel.with_suffix('.txt')
        if not label.is_file():
            label = labels_root / rel.parent / f'{img.stem}.txt'
        if label.is_file():
            pairs.append((img, label))
    return pairs


def split_pairs(pairs: list[tuple[Path, Path]], seed: int) -> dict[str, list[tuple[Path, Path]]]:
    rng = random.Random(seed)
    shuffled = pairs[:]
    rng.shuffle(shuffled)
    n_train = int(len(shuffled) * TRAIN_RATIO)
    n_val = int(len(shuffled) * VAL_RATIO)
    return {
        'train': shuffled[:n_train],
        'val': shuffled[n_train:n_train + n_val],
        'test': shuffled[n_train + n_val:],
    }


def remap_label_content(text: str, id_map: dict[int, int]) -> str:
    lines = []
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split()
        cls = int(parts[0])
        if cls not in id_map:
            raise ValueError(f'Unexpected class id {cls}')
        parts[0] = str(id_map[cls])
        lines.append(' '.join(parts))
    return '\n'.join(lines) + ('\n' if lines else '')


def copy_label(src: Path, dest: Path, id_map: dict[int, int] | None) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if id_map:
        dest.write_text(remap_label_content(src.read_text(encoding='utf-8'), id_map), encoding='utf-8')
    else:
        shutil.copy2(src, dest)


def write_data_yaml(out_root: Path, nc: int, names: dict[int, str]) -> None:
    lines = [
        f'# Auto-generated {datetime.now(timezone.utc).isoformat()}',
        f'path: {out_root.resolve().as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        f'nc: {nc}',
        'names:',
    ]
    for idx in sorted(names):
        lines.append(f'  {idx}: {names[idx]}')
    (out_root / 'data.yaml').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser(description='Split YOLO export into train/val/test')
    parser.add_argument('--export', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--nc', type=int, default=None)
    args = parser.parse_args()

    export_root = EXPORTS_ROOT / args.export
    if not export_root.is_dir():
        raise SystemExit(f'Export not found: {export_root}')

    pairs = collect_pairs(export_root)
    if not pairs:
        raise SystemExit('No image/label pairs found')

    splits = split_pairs(pairs, args.seed)
    out_root = SPLITS_ROOT / args.output
    if out_root.exists():
        shutil.rmtree(out_root)

    class_map_path = DATASETS_ROOT / 'labels' / 'yolo' / 'class-map.json'
    id_map: dict[int, int] | None = None
    manifest_path = export_root / 'manifest.json'
    roboflow_labeled = False
    if manifest_path.is_file():
        roboflow_labeled = json.loads(manifest_path.read_text(encoding='utf-8')).get('mode') == 'roboflow_labeled'
    if 'plate' in args.output.lower() and class_map_path.is_file() and not roboflow_labeled:
        class_map = json.loads(class_map_path.read_text(encoding='utf-8'))
        src_ids = sorted(set(class_map['plate_folder_to_class_id'].values()))
        id_map = {src_id: idx for idx, src_id in enumerate(src_ids)}

    for split_name, items in splits.items():
        for img, label in items:
            dest_img = out_root / 'images' / split_name / img.name
            dest_lbl = out_root / 'labels' / split_name / label.name
            dest_img.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img, dest_img)
            copy_label(label, dest_lbl, id_map)

    names: dict[int, str] = {}
    if class_map_path.is_file():
        class_map = json.loads(class_map_path.read_text(encoding='utf-8'))
        if 'plate' in args.output.lower():
            plate_names = ['plate_private', 'plate_commercial', 'plate_government']
            names = {i: plate_names[i] for i in range(len(plate_names))}
            nc = len(plate_names)
        elif 'vehicle' in args.output.lower():
            vehicle_names = ['bus', 'sedan', 'motorcycle', 'truck', 'scooter']
            names = {i: vehicle_names[i] for i in range(len(vehicle_names))}
            nc = len(vehicle_names)
        elif args.nc:
            nc = args.nc
            names = {int(k): v for k, v in class_map['names'].items() if int(k) < nc}
        else:
            nc = class_map['nc']
            names = {int(k): v for k, v in class_map['names'].items()}
    else:
        nc = args.nc or 1
        names = {0: 'object'}

    write_data_yaml(out_root, nc, names)

    report = {
        'export': args.export,
        'output': str(out_root),
        'total': len(pairs),
        'splits': {k: len(v) for k, v in splits.items()},
        'seed': args.seed,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }
    (out_root / 'split_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Export: {export_root}')
    print(f'Split: {out_root}')
    for k, v in report['splits'].items():
        print(f'  {k}: {v}')
    print(f'data.yaml: nc={nc}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
