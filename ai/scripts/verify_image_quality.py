#!/usr/bin/env python
"""
Filter or flag low-quality images using Laplacian blur variance (default threshold 80.0).

Usage:
  python ai/scripts/verify_image_quality.py --dataset ai/dataset
  python ai/scripts/verify_image_quality.py --dataset ai/dataset_10 --threshold 80 --quarantine
"""
from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DEFAULT_BLUR_THRESHOLD, REPORTS_DIR, iter_images, write_csv


def blur_score(path: Path) -> tuple[float, float]:
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f'Cannot read {path}')
    lap = cv2.Laplacian(img, cv2.CV_64F)
    return float(lap.var()), float(img.mean())


def main() -> int:
    parser = argparse.ArgumentParser(description='Laplacian blur quality filter')
    parser.add_argument('--dataset', type=Path, default=AI_ROOT / 'dataset')
    parser.add_argument('--threshold', type=float, default=DEFAULT_BLUR_THRESHOLD)
    parser.add_argument('--quarantine', action='store_true', help='Move failing images to quarantine/')
    args = parser.parse_args()

    dataset = args.dataset.resolve()
    rows: list[list[object]] = []
    failed = 0
    quarantine_root = dataset / 'quarantine' / 'blur'

    for split, path in iter_images(dataset):
        try:
            score, brightness = blur_score(path)
        except ValueError as exc:
            rows.append([split, path.name, '', '', 'read_error', str(exc)])
            failed += 1
            continue
        ok = score >= args.threshold
        status = 'pass' if ok else 'fail'
        rows.append([split, path.name, f'{score:.2f}', f'{brightness:.1f}', status, ''])
        if not ok:
            failed += 1
            if args.quarantine:
                dest = quarantine_root / split / path.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(path), dest)

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    csv_path = REPORTS_DIR / f'image_quality_{stamp}.csv'
    write_csv(csv_path, ['split', 'image', 'blur_score', 'brightness', 'status', 'note'], rows)

    print(f'Dataset: {dataset}')
    print(f'Images checked: {len(rows)}')
    print(f'Below threshold ({args.threshold}): {failed}')
    print(f'CSV: {csv_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
