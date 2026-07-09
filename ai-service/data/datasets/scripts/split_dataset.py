"""Task 140 — Dataset split utility (YOLO images/labels).

Creates deterministic train/val/test splits by image stem from validated YOLO exports.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from datetime import datetime, timezone
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[3]
IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split YOLO dataset into train/val/test")
    parser.add_argument('--input-images-dir', required=True, help='Source images directory')
    parser.add_argument('--input-labels-dir', required=True, help='Source YOLO labels directory')
    parser.add_argument('--output-dir', default='data/datasets/splits', help='Output split base directory')
    parser.add_argument('--train-ratio', type=float, default=0.7)
    parser.add_argument('--val-ratio', type=float, default=0.2)
    parser.add_argument('--test-ratio', type=float, default=0.1)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument(
        '--report',
        default='data/datasets/manifests/dataset_split_report.json',
        help='Report JSON output path (relative to ai-service by default)',
    )
    return parser.parse_args()


def resolve_existing_dir(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path
    candidates = [Path.cwd() / path, SERVICE_ROOT / path]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


def resolve_path(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path
    return SERVICE_ROOT / path


def list_image_stems(images_dir: Path) -> set[str]:
    stems: set[str] = set()
    for p in images_dir.iterdir():
        if not p.is_file() or p.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        stems.add(p.stem)
    return stems


def copy_pair(stem: str, images_in: Path, labels_in: Path, images_out: Path, labels_out: Path) -> None:
    # Copy image (find any allowed suffix)
    image_path = None
    for suffix in IMAGE_SUFFIXES:
        candidate = images_in / f"{stem}{suffix}"
        if candidate.exists():
            image_path = candidate
            break
    if image_path is None:
        raise FileNotFoundError(f"Image file not found for stem {stem} in {images_in}")

    label_path = labels_in / f"{stem}.txt"
    if not label_path.exists():
        raise FileNotFoundError(f"Label file not found for stem {stem} in {labels_in}")

    images_out.mkdir(parents=True, exist_ok=True)
    labels_out.mkdir(parents=True, exist_ok=True)

    shutil.copy2(image_path, images_out / image_path.name)
    shutil.copy2(label_path, labels_out / label_path.name)


def main() -> None:
    args = parse_args()
    images_in = resolve_existing_dir(args.input_images_dir)
    labels_in = resolve_existing_dir(args.input_labels_dir)
    output_dir = resolve_path(args.output_dir)
    report_path = resolve_path(args.report)

    if not images_in.is_dir():
        raise FileNotFoundError(f"Images directory not found: {images_in}")
    if not labels_in.is_dir():
        raise FileNotFoundError(f"Labels directory not found: {labels_in}")

    if abs((args.train_ratio + args.val_ratio + args.test_ratio) - 1.0) > 1e-6:
        raise ValueError("train/val/test ratios must sum to 1.0")

    stems = sorted(list_image_stems(images_in))
    if not stems:
        raise ValueError(f"No images found under {images_in}")

    rng = random.Random(args.seed)
    rng.shuffle(stems)

    n = len(stems)
    n_train = int(round(n * args.train_ratio))
    n_val = int(round(n * args.val_ratio))
    # Ensure test gets the remainder
    n_test = n - n_train - n_val

    # If rounding creates negative splits, clamp and rebalance deterministically.
    if n_test < 0:
        n_test = 0
        n_val = max(0, n - n_train)
    if n_train < 0:
        n_train = 0
    if n_val < 0:
        n_val = 0

    train_stems = stems[:n_train]
    val_stems = stems[n_train : n_train + n_val]
    test_stems = stems[n_train + n_val :]

    # Reset output dirs
    for split in ('train', 'val', 'test'):
        split_dir = output_dir / split
        if split_dir.exists():
            shutil.rmtree(split_dir)

    # Copy pairs
    for split, split_stems in (
        ('train', train_stems),
        ('val', val_stems),
        ('test', test_stems),
    ):
        for stem in split_stems:
            copy_pair(
                stem=stem,
                images_in=images_in,
                labels_in=labels_in,
                images_out=output_dir / split / 'images',
                labels_out=output_dir / split / 'labels',
            )

    # Ensure empty splits still have the expected directory structure
    for split in ('train', 'val', 'test'):
        (output_dir / split / 'images').mkdir(parents=True, exist_ok=True)
        (output_dir / split / 'labels').mkdir(parents=True, exist_ok=True)

    report = {
        'task': 140,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'input_images_dir': str(images_in),
        'input_labels_dir': str(labels_in),
        'output_dir': str(output_dir),
        'seed': args.seed,
        'ratios': {
            'train': args.train_ratio,
            'val': args.val_ratio,
            'test': args.test_ratio,
        },
        'counts': {
            'train': len(train_stems),
            'val': len(val_stems),
            'test': len(test_stems),
        },
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f"Split complete: train={len(train_stems)} val={len(val_stems)} test={len(test_stems)}")
    print(f"Report: {report_path}")


if __name__ == '__main__':
    main()

