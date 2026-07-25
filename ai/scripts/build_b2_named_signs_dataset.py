#!/usr/bin/env python
"""
Phase B2: Convert Dim Sareach VIA CSV annotations → multi-class YOLO dataset + train.

Source labels in cambodia_traffic_signs_yolo/labels are single-class (id=0).
Fine-grained names live in data/CAM_TSR_csv.csv (Name attribute).

Usage (from repo root):
  python ai/scripts/build_b2_named_signs_dataset.py
  python ai/scripts/build_b2_named_signs_dataset.py --train --epochs 20
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import shutil
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

AI_ROOT = Path(__file__).resolve().parents[1]
SRC = AI_ROOT / 'datasets' / 'external' / 'cambodia_traffic_signs_yolo'
OUT = AI_ROOT / 'datasets' / 'splits' / 'b2_cambodia_named_signs'
WEIGHTS = AI_ROOT / 'weights'

# Map VIA Name → stable class_key (aligned to CamTraffic catalog style where possible)
NAME_TO_KEY: dict[str, str] = {
    'STOP': 'STOP',
    'GIVE WAY': 'YIELD_GIVE_WAY',
    'GIVE WAY AT RB': 'YIELD_AT_ROUNDABOUT',
    'PRIORITY ROAD': 'PRIORITY_ROAD',
    'NO ENTRY': 'NO_ENTRY',
    'NO PARKING': 'NO_PARKING',
    'NO STOPPING': 'NO_STOPPING',
    'NO UTURN': 'NO_U_TURN',
    'NO OVERTAKING': 'NO_OVERTAKING',
    'NO HORN': 'NO_HORN',
    'END PROHIBIT': 'END_PROHIBIT',
    'END SPEED LIMIT': 'END_SPEED_LIMIT',
    '30 SPEED LIMIT': 'SPEED_LIMIT_30',
    '40 SPEED LIMIT': 'SPEED_LIMIT_40',
    '60 SPEED LIMIT': 'SPEED_LIMIT_60',
    '80 SPEED LIMIT': 'SPEED_LIMIT_80',
    '30 MIN SPEED LIMIT': 'MIN_SPEED_30',
    'KEEP RIGHT': 'KEEP_RIGHT',
    'SLOW DOWN': 'SLOW_DOWN',
    'LEFT BEND': 'LEFT_BEND',
    'RIGHT BEND': 'RIGHT_BEND',
    'WINDING ROAD': 'WINDING_ROAD',
    'ROAD JUNCTION': 'ROAD_JUNCTION',
    'ROAD JUNCTION ON THE LEFT': 'JUNCTION_LEFT',
    'ROAD JUNCTION ON THE RIGHT': 'JUNCTION_RIGHT',
    'ROUND ABOUT': 'ROUNDABOUT',
    'CARRIAGE WAY NARROWS': 'CARRIAGEWAY_NARROWS',
    'STEEP ASCENT': 'STEEP_ASCENT',
    'STEEP DESCENT': 'STEEP_DESCENT',
    'CHILDREN CROSSING': 'CHILDREN_CROSSING',
    'PEDESTRAIN CROSSING': 'PEDESTRIAN_CROSSING',
    'PEDESTRAIN CR AREA': 'PEDESTRIAN_AREA',
    'HOSPITAL': 'HOSPITAL',
    'DENGERS': 'DANGER',
}


def load_image_size(path: Path) -> tuple[int, int] | None:
    if Image is None:
        return None
    try:
        with Image.open(path) as im:
            return im.size  # w, h
    except Exception:
        return None


def build_dataset(min_per_class: int = 3, seed: int = 42) -> dict:
    csv_path = SRC / 'data' / 'CAM_TSR_csv.csv'
    images_dir = SRC / 'images'
    if not csv_path.is_file():
        raise FileNotFoundError(csv_path)

    # Collect boxes per image
    by_image: dict[str, list[dict]] = {}
    name_counts: Counter[str] = Counter()

    with csv_path.open(encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            fname = (row.get('filename') or '').strip()
            if not fname:
                continue
            try:
                attrs = json.loads(row.get('region_attributes') or '{}')
                shape = json.loads(row.get('region_shape_attributes') or '{}')
            except json.JSONDecodeError:
                continue
            name = (attrs.get('Name') or '').strip()
            if not name or name not in NAME_TO_KEY:
                continue
            if shape.get('name') != 'rect':
                continue
            x, y = float(shape['x']), float(shape['y'])
            w, h = float(shape['width']), float(shape['height'])
            if w <= 1 or h <= 1:
                continue
            by_image.setdefault(fname, []).append({
                'name': name,
                'key': NAME_TO_KEY[name],
                'xywh': (x, y, w, h),
            })
            name_counts[name] += 1

    # Keep classes with enough samples
    keep_names = {n for n, c in name_counts.items() if c >= min_per_class}
    class_keys = sorted({NAME_TO_KEY[n] for n in keep_names})
    key_to_id = {k: i for i, k in enumerate(class_keys)}

    # Filter boxes
    filtered: dict[str, list[dict]] = {}
    for fname, boxes in by_image.items():
        kept = [b for b in boxes if b['name'] in keep_names]
        if kept:
            filtered[fname] = kept

    # Prepare output dirs
    if OUT.exists():
        shutil.rmtree(OUT)
    for split in ('train', 'val', 'test'):
        (OUT / 'images' / split).mkdir(parents=True)
        (OUT / 'labels' / split).mkdir(parents=True)

    rng = random.Random(seed)
    files = sorted(filtered.keys())
    rng.shuffle(files)
    n = len(files)
    n_train = int(n * 0.70)
    n_val = int(n * 0.20)
    splits = {
        'train': files[:n_train],
        'val': files[n_train:n_train + n_val],
        'test': files[n_train + n_val:],
    }

    size_cache: dict[str, tuple[int, int]] = {}
    written = 0
    skipped = 0

    for split, fnames in splits.items():
        for fname in fnames:
            img_path = images_dir / fname
            if not img_path.is_file():
                # try case variants
                alt = list(images_dir.glob(fname))
                if not alt:
                    skipped += 1
                    continue
                img_path = alt[0]
            size = size_cache.get(fname)
            if size is None:
                size = load_image_size(img_path)
                if size is None:
                    skipped += 1
                    continue
                size_cache[fname] = size
            iw, ih = size
            lines = []
            for b in filtered[fname]:
                x, y, bw, bh = b['xywh']
                cx = (x + bw / 2) / iw
                cy = (y + bh / 2) / ih
                nw = bw / iw
                nh = bh / ih
                # clip
                cx = min(max(cx, 0), 1)
                cy = min(max(cy, 0), 1)
                nw = min(max(nw, 1e-6), 1)
                nh = min(max(nh, 1e-6), 1)
                cid = key_to_id[b['key']]
                lines.append(f'{cid} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}')
            if not lines:
                continue
            dest_img = OUT / 'images' / split / img_path.name
            dest_lbl = OUT / 'labels' / split / f'{img_path.stem}.txt'
            if not dest_img.exists():
                shutil.copy2(img_path, dest_img)
            dest_lbl.write_text('\n'.join(lines) + '\n', encoding='utf-8')
            written += 1

    names_yaml = {i: k for k, i in key_to_id.items()}
    yaml_lines = [
        f'# B2 named-signs dataset — generated {datetime.now(timezone.utc).isoformat()}',
        f'path: {OUT.resolve().as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        f'nc: {len(class_keys)}',
        'names:',
    ]
    for i in sorted(names_yaml):
        yaml_lines.append(f'  {i}: {names_yaml[i]}')
    (OUT / 'data.yaml').write_text('\n'.join(yaml_lines) + '\n', encoding='utf-8')

    meta = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source_csv': str(csv_path),
        'images_with_labels': written,
        'skipped': skipped,
        'nc': len(class_keys),
        'names': names_yaml,
        'name_counts_kept': {n: name_counts[n] for n in sorted(keep_names)},
        'splits': {k: len(v) for k, v in splits.items()},
        'note': 'Converted from VIA Name attributes; original YOLO txt was single-class.',
    }
    (OUT / 'build_meta.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(json.dumps(meta, indent=2))
    print(f'data.yaml → {OUT / "data.yaml"}')
    return meta


def run_train(epochs: int = 20, device: str = 'cpu', batch: int = 4, imgsz: int = 640) -> Path:
    from ultralytics import YOLO

    data = OUT / 'data.yaml'
    if not data.is_file():
        raise FileNotFoundError('Run build first')
    WEIGHTS.mkdir(parents=True, exist_ok=True)
    # Fine-tune from existing 248-class or nano base
    base_w = WEIGHTS / 'best.pt'
    model_path = str(base_w) if base_w.is_file() else 'yolov8n.pt'
    print(f'Training from: {model_path}')
    model = YOLO(model_path)
    results = model.train(
        data=str(data),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project=str(AI_ROOT / 'training' / 'runs' / 'detect'),
        name='b2_cambodia_named_signs',
        exist_ok=True,
        patience=8,
        plots=True,
    )
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    dest = WEIGHTS / 'best_b2_named.pt'
    if best.is_file():
        shutil.copy2(best, dest)
        print(f'Saved: {dest}')
        # Also write metrics stub from results.csv if present
        csv_res = Path(results.save_dir) / 'results.csv'
        if csv_res.is_file():
            shutil.copy2(csv_res, WEIGHTS / 'b2_named_results.csv')
    return dest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--min-per-class', type=int, default=3)
    parser.add_argument('--train', action='store_true')
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--batch', type=int, default=4)
    args = parser.parse_args()
    build_dataset(min_per_class=args.min_per_class)
    if args.train:
        run_train(epochs=args.epochs, device=args.device, batch=args.batch)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
