#!/usr/bin/env python
"""
Import CAM_TSR street snapshots (Data/images + Data/labels) into a YOLO split.

Single class id 0 = generic traffic_sign (bbox only; class-agnostic detector seed).

Usage (from repo root):
  python ai/scripts/import_cam_tsr_data.py
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

from _common import DATASETS_ROOT, IMAGE_EXTS, REPORTS_DIR  # noqa: E402
from dim_sareach_paths import cam_tsr_data_root  # noqa: E402

OUTPUT_NAME = 'cam_tsr_street_signs_dim_sareach'
TRAIN_RATIO = 0.70
VAL_RATIO = 0.20


def collect_pairs(root: Path) -> list[tuple[Path, Path]]:
    images_root = root / 'images'
    labels_root = root / 'labels'
    pairs: list[tuple[Path, Path]] = []
    for img in sorted(images_root.rglob('*')):
        if not img.is_file() or img.suffix.lower() not in IMAGE_EXTS:
            continue
        lbl = labels_root / f'{img.stem}.txt'
        if lbl.is_file():
            pairs.append((img, lbl))
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


def main() -> int:
    parser = argparse.ArgumentParser(description='Import CAM_TSR Data folder to YOLO split')
    parser.add_argument('--source', type=Path, default=None)
    parser.add_argument('--output', type=str, default=OUTPUT_NAME)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    source = (args.source or cam_tsr_data_root()).resolve()
    if not source.is_dir():
        raise SystemExit(f'CAM_TSR Data folder not found: {source}')

    pairs = collect_pairs(source)
    if not pairs:
        raise SystemExit(f'No image/label pairs under {source}')

    out_root = DATASETS_ROOT / 'splits' / args.output
    if out_root.exists():
        shutil.rmtree(out_root)

    buckets = split_pairs(pairs, args.seed)
    for split, bucket in buckets.items():
        for img, lbl in bucket:
            dest_img = out_root / 'images' / split / img.name
            dest_lbl = out_root / 'labels' / split / lbl.name
            dest_img.parent.mkdir(parents=True, exist_ok=True)
            dest_lbl.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img, dest_img)
            shutil.copy2(lbl, dest_lbl)

    yaml = '\n'.join([
        f'# Auto-generated {datetime.now(timezone.utc).isoformat()}',
        f'path: {out_root.as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        'nc: 1',
        'names:',
        '  0: traffic_sign',
        '',
    ])
    (out_root / 'data.yaml').write_text(yaml, encoding='utf-8')

    report = {
        'source': str(source),
        'output': str(out_root),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'pairs_total': len(pairs),
        'split': {k: len(v) for k, v in buckets.items()},
        'nc': 1,
        'names': ['traffic_sign'],
        'seed': args.seed,
        'notes': 'Video snapshot frames; labels are class-agnostic sign boxes (id 0).',
    }
    (out_root / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    (REPORTS_DIR / f'import_cam_tsr_{stamp}.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Source: {source}')
    print(f'Pairs: {len(pairs)}')
    print(f"Split: {report['split']}")
    print(f'Output: {out_root}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
