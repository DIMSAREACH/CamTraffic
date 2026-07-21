#!/usr/bin/env python
"""
Auto-label Dim Sareach Vichicle images and build a YOLO train/val/test split.

- BBox + type: YOLO best_combined.pt (vehicle classes 10–18)
- Remap to 5-class CamTraffic scheme (bus, sedan, motorcycle, truck, scooter)
- Output: ai/datasets/splits/cambodia_vehicle_dim_sareach

Usage (from repo root):
  python ai/scripts/complete_vehicle_dataset.py
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

from _common import AI_ROOT, DATASETS_ROOT, IMAGE_EXTS, REPORTS_DIR  # noqa: E402
from dim_sareach_paths import vehicle_detect_root  # noqa: E402

DEFAULT_SOURCE = vehicle_detect_root() / 'Vichicle'
DEFAULT_WEIGHTS = AI_ROOT / 'weights' / 'best_combined.pt'
OUTPUT_NAME = 'cambodia_vehicle_dim_sareach'

# Combined 31-class ids → local 5-class (match cambodia_vehicle_reference_remapped)
LOCAL_NAMES = ['bus', 'sedan', 'motorcycle', 'truck', 'scooter']
GLOBAL_TO_LOCAL = {
    10: 1,  # sedan
    11: 1,  # suv → sedan
    12: 3,  # pickup → truck
    13: 2,  # motorcycle
    14: 4,  # scooter
    15: 0,  # bus
    16: 3,  # truck
    17: 1,  # van → sedan
    18: 1,  # taxi → sedan
}

TRAIN_RATIO = 0.70
VAL_RATIO = 0.20


def xyxy_to_yolo(xyxy, w: int, h: int) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = xyxy
    bw = max(0.0, x2 - x1)
    bh = max(0.0, y2 - y1)
    cx = x1 + bw / 2.0
    cy = y1 + bh / 2.0
    return (
        max(0.0, min(1.0, cx / w)),
        max(0.0, min(1.0, cy / h)),
        max(0.0, min(1.0, bw / w)),
        max(0.0, min(1.0, bh / h)),
    )


def collect_images(source: Path) -> list[Path]:
    return sorted(
        p for p in source.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def auto_label(
    images: list[Path],
    weights: Path,
    conf: float,
    imgsz: int,
) -> tuple[list[tuple[Path, str, dict]], list[dict]]:
    from ultralytics import YOLO

    model = YOLO(str(weights))
    labeled: list[tuple[Path, str, dict]] = []
    misses: list[dict] = []

    for img in images:
        result = model.predict(source=str(img), conf=conf, imgsz=imgsz, verbose=False)[0]
        h, w = result.orig_shape
        boxes = result.boxes
        lines: list[str] = []
        class_hits: dict[str, int] = {}
        best_conf = 0.0

        if boxes is not None and len(boxes):
            for box in boxes:
                gid = int(box.cls.item())
                if gid not in GLOBAL_TO_LOCAL:
                    continue
                local_cls = GLOBAL_TO_LOCAL[gid]
                score = float(box.conf.item())
                best_conf = max(best_conf, score)
                cx, cy, bw, bh = xyxy_to_yolo(box.xyxy[0].tolist(), w, h)
                lines.append(f'{local_cls} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}')
                name = LOCAL_NAMES[local_cls]
                class_hits[name] = class_hits.get(name, 0) + 1

        meta = {
            'file': img.name,
            'detections': len(lines),
            'by_class': class_hits,
            'best_conf': round(best_conf, 4),
        }
        if not lines:
            misses.append(meta)
            continue
        labeled.append((img, '\n'.join(lines) + '\n', meta))

    return labeled, misses


def split_items(items: list, seed: int) -> dict[str, list]:
    rng = random.Random(seed)
    shuffled = items[:]
    rng.shuffle(shuffled)
    n_train = max(1, int(len(shuffled) * TRAIN_RATIO)) if shuffled else 0
    n_val = int(len(shuffled) * VAL_RATIO) if len(shuffled) > 2 else 0
    # Ensure test gets remainder; if tiny set, keep at least one val when possible
    if len(shuffled) >= 3 and n_train + n_val >= len(shuffled):
        n_val = max(1, len(shuffled) - n_train - 1)
    return {
        'train': shuffled[:n_train],
        'val': shuffled[n_train:n_train + n_val],
        'test': shuffled[n_train + n_val:],
    }


def write_split(
    labeled: list[tuple[Path, str, dict]],
    output_root: Path,
    seed: int,
) -> dict:
    if output_root.exists():
        shutil.rmtree(output_root)
    for split in ('train', 'val', 'test'):
        (output_root / 'images' / split).mkdir(parents=True, exist_ok=True)
        (output_root / 'labels' / split).mkdir(parents=True, exist_ok=True)

    buckets = split_items(labeled, seed)
    counts = {k: len(v) for k, v in buckets.items()}
    by_class = {name: 0 for name in LOCAL_NAMES}

    for split, items in buckets.items():
        for img, label_text, meta in items:
            dest_img = output_root / 'images' / split / img.name
            dest_lbl = output_root / 'labels' / split / f'{img.stem}.txt'
            shutil.copy2(img, dest_img)
            dest_lbl.write_text(label_text, encoding='utf-8')
            for name, n in meta['by_class'].items():
                by_class[name] = by_class.get(name, 0) + n

    yaml_text = (
        f'# Auto-generated {datetime.now(timezone.utc).isoformat()}\n'
        f'path: {output_root.as_posix()}\n'
        'train: images/train\n'
        'val: images/val\n'
        'test: images/test\n'
        f'nc: {len(LOCAL_NAMES)}\n'
        'names:\n'
        + ''.join(f'  {i}: {name}\n' for i, name in enumerate(LOCAL_NAMES))
    )
    (output_root / 'data.yaml').write_text(yaml_text, encoding='utf-8')
    return {'counts': counts, 'by_class': by_class}


def main() -> int:
    parser = argparse.ArgumentParser(description='Complete Vichicle YOLO dataset')
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--weights', type=Path, default=DEFAULT_WEIGHTS)
    parser.add_argument('--output', type=str, default=OUTPUT_NAME)
    parser.add_argument('--conf', type=float, default=0.25)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    source = args.source.resolve()
    weights = args.weights.resolve()
    if not source.is_dir():
        raise SystemExit(f'Source not found: {source}')
    if not weights.is_file():
        raise SystemExit(f'Weights not found: {weights}')

    images = collect_images(source)
    if not images:
        raise SystemExit(f'No images in {source}')

    print(f'Source: {source}')
    print(f'Images: {len(images)}')
    print(f'Weights: {weights}')
    print('Running auto-label...')

    labeled, misses = auto_label(images, weights, conf=args.conf, imgsz=args.imgsz)
    output_root = DATASETS_ROOT / 'splits' / args.output
    stats = write_split(labeled, output_root, seed=args.seed)

    report = {
        'source': str(source),
        'weights': str(weights),
        'output': str(output_root),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'images_total': len(images),
        'labeled': len(labeled),
        'missed': len(misses),
        'split': stats['counts'],
        'by_class_boxes': stats['by_class'],
        'missed_files': misses,
        'conf': args.conf,
        'seed': args.seed,
        'class_map': {
            'global_to_local': {str(k): v for k, v in GLOBAL_TO_LOCAL.items()},
            'local_names': LOCAL_NAMES,
            'notes': 'suv/van/taxi→sedan, pickup→truck (match cambodia_vehicle_reference_remapped)',
        },
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    report_path = REPORTS_DIR / f'complete_vehicle_{stamp}.json'
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    (output_root / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Labeled: {len(labeled)} / {len(images)}')
    print(f"Split: {stats['counts']}")
    print(f"Boxes by class: {stats['by_class']}")
    if misses:
        print(f'Missed (no vehicle bbox): {len(misses)}')
        for m in misses:
            print(f"  - {m['file']}")
    print(f'Output: {output_root}')
    print(f'Report: {report_path}')
    return 0 if labeled else 1


if __name__ == '__main__':
    raise SystemExit(main())
