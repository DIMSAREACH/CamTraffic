#!/usr/bin/env python
"""
Offline augmentation for small YOLO datasets (flip, brightness, slight rotation).

Usage:
  python ai/scripts/augment_dataset.py --dataset ai/datasets/splits/plate_number_reference_remapped
  python ai/scripts/augment_dataset.py --export BATCH-REF-VEH-PLATE-001 --target-count 80
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, IMAGE_EXTS, iter_images, label_path_for
from validate_dataset import parse_label

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'


def parse_boxes(label_path: Path) -> list[tuple[int, float, float, float, float]]:
    return parse_label(label_path)


def write_boxes(label_path: Path, boxes: list[tuple[int, float, float, float, float]]) -> None:
    lines = [f'{cls} {x:.6f} {y:.6f} {w:.6f} {h:.6f}' for cls, x, y, w, h in boxes]
    label_path.write_text('\n'.join(lines) + ('\n' if lines else ''), encoding='utf-8')


def hflip_boxes(boxes: list[tuple[int, float, float, float, float]]) -> list[tuple[int, float, float, float, float]]:
    return [(cls, 1.0 - x, y, w, h) for cls, x, y, w, h in boxes]


def augment_image(img: np.ndarray, mode: str) -> np.ndarray:
    if mode == 'hflip':
        return cv2.flip(img, 1)
    if mode == 'bright':
        return np.clip(img.astype(np.float32) * 1.15 + 10, 0, 255).astype(np.uint8)
    if mode == 'dark':
        return np.clip(img.astype(np.float32) * 0.85, 0, 255).astype(np.uint8)
    if mode == 'blur':
        return cv2.GaussianBlur(img, (3, 3), 0)
    return img


def augment_root(root: Path, target_count: int, seed: int) -> dict:
    rng = random.Random(seed)
    pairs: list[tuple[Path, Path]] = []
    for _split, img in iter_images(root):
        label = label_path_for(img)
        if label:
            pairs.append((img, label))

    if not pairs:
        return {'root': str(root), 'before': 0, 'after': 0, 'added': 0}

    modes = ['hflip', 'bright', 'dark']
    added = 0
    idx = 0
    while len(pairs) + added < target_count:
        src_img, src_lbl = pairs[idx % len(pairs)]
        mode = modes[rng.randint(0, len(modes) - 1)]
        img = cv2.imread(str(src_img))
        if img is None:
            idx += 1
            continue
        aug = augment_image(img, mode)
        boxes = parse_boxes(src_lbl)
        if mode == 'hflip':
            boxes = hflip_boxes(boxes)

        split = src_img.parent.name
        images_dir = root / 'images' / split
        labels_dir = root / 'labels' / split
        stem = f'{src_img.stem}_aug_{mode}_{added:04d}'
        dest_img = images_dir / f'{stem}{src_img.suffix.lower()}'
        dest_lbl = labels_dir / f'{stem}.txt'
        cv2.imwrite(str(dest_img), aug)
        write_boxes(dest_lbl, boxes)
        added += 1
        idx += 1
        if added > target_count * 3:
            break

    return {
        'root': str(root),
        'before': len(pairs),
        'after': len(pairs) + added,
        'added': added,
        'target': target_count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Augment YOLO dataset')
    parser.add_argument('--dataset', type=Path, default=None)
    parser.add_argument('--export', type=str, default=None)
    parser.add_argument('--target-count', type=int, default=80)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    if args.export:
        root = EXPORTS_ROOT / args.export
    elif args.dataset:
        root = args.dataset.resolve()
    else:
        raise SystemExit('Provide --dataset or --export')

    report = augment_root(root, args.target_count, args.seed)
    print(f"Root: {report['root']}")
    print(f"Before: {report['before']} → After: {report['after']} (+{report['added']})")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
