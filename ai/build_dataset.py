#!/usr/bin/env python
"""
Build YOLOv8 dataset from Cambodia road sign reference PNGs.

Source folder (thesis reference):
  Reference(PDF Download)/Dim Sareach/ស្លាកសញ្ញាចរាចរណ៏/

Usage:
  python build_dataset.py
  python build_dataset.py --source "D:/path/to/ស្លាកសញ្ញាចរាចរណ៏"
"""
from __future__ import annotations

import argparse
import random
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
DEFAULT_SOURCE = (
    ROOT.parent.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'ស្លាកសញ្ញាចរាចរណ៏'
)
DATASET = ROOT / 'dataset'
AUGMENTS_PER_SIGN = 12
TRAIN_RATIO = 0.85
CANVAS = 640
SIGN_CODE_RE = re.compile(
    r'Cambodia_road_sign_([A-Z]\d+-\d+[a-z]?)(?:\([^)]*\))?',
    re.IGNORECASE,
)


def parse_sign_code(filename: str) -> str | None:
    m = SIGN_CODE_RE.search(filename)
    if not m:
        return None
    return m.group(1).upper().replace('-', '_')


def category_for_code(code: str) -> str:
    prefix = code[0]
    if prefix == 'R':
        return 'prohibitory'
    if prefix == 'W':
        return 'warning'
    if prefix in ('G', 'P'):
        return 'informative'
    if prefix == 'S':
        return 'mandatory'
    return 'warning'


def sign_bbox_rgba(img: Image.Image) -> tuple[float, float, float, float]:
    """Normalized YOLO bbox from non-transparent pixels."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 32)
    if len(xs) == 0:
        return 0.5, 0.5, 0.85, 0.85
    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    w, h = img.size
    xc = ((x1 + x2) / 2) / w
    yc = ((y1 + y2) / 2) / h
    bw = (x2 - x1) / w
    bh = (y2 - y1) / h
    pad = 0.04
    return (
        min(1, max(0, xc)),
        min(1, max(0, yc)),
        min(1, max(0.05, bw + pad)),
        min(1, max(0.05, bh + pad)),
    )


def composite_sign(sign: Image.Image, canvas_size: int = CANVAS) -> tuple[Image.Image, tuple[float, float, float, float]]:
    """Place sign on synthetic background; return RGB image + bbox."""
    sign = sign.convert('RGBA')
    max_side = int(canvas_size * random.uniform(0.35, 0.72))
    sign.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    bg = Image.new(
        'RGB',
        (canvas_size, canvas_size),
        (
            random.randint(180, 240),
            random.randint(180, 240),
            random.randint(185, 245),
        ),
    )
    if random.random() < 0.4:
        # asphalt-like tint
        bg = Image.new(
            'RGB',
            (canvas_size, canvas_size),
            (random.randint(55, 85), random.randint(55, 85), random.randint(60, 90)),
        )
    x = random.randint(20, max(20, canvas_size - sign.width - 20))
    y = random.randint(20, max(20, canvas_size - sign.height - 20))
    bg.paste(sign, (x, y), sign)

    # bbox in canvas coordinates
    arr = np.array(sign)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 32)
    if len(xs) == 0:
        return bg, (0.5, 0.5, 0.5, 0.5)
    gx1, gx2 = x + xs.min(), x + xs.max()
    gy1, gy2 = y + ys.min(), y + ys.max()
    xc = (gx1 + gx2) / 2 / canvas_size
    yc = (gy1 + gy2) / 2 / canvas_size
    bw = (gx2 - gx1) / canvas_size
    bh = (gy2 - gy1) / canvas_size
    return bg, (xc, yc, bw, bh)


def collect_sources(source_dir: Path) -> dict[str, list[Path]]:
    by_code: dict[str, list[Path]] = {}
    for path in sorted(source_dir.glob('Cambodia_road_sign*.png')):
        code = parse_sign_code(path.name)
        if not code:
            continue
        by_code.setdefault(code, []).append(path)
    return by_code


def write_data_yaml(classes: list[str], out_path: Path) -> None:
    lines = [
        '# Auto-generated from Cambodia reference signs',
        'path: ./dataset',
        'train: images/train',
        'val: images/val',
        f'nc: {len(classes)}',
        'names:',
    ]
    for i, name in enumerate(classes):
        lines.append(f'  {i}: {name}')
    out_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def write_catalog(classes: list[str], out_path: Path) -> None:
    import json

    try:
        from sign_metadata import load_overrides
        overrides = load_overrides()
    except ImportError:
        overrides = {}

    catalog = []
    for code in classes:
        display = code.replace('_', '-')
        row = {
            'sign_code': display,
            'sign_name': f'Traffic Sign {display}',
            'category': category_for_code(code),
            'description': f'Cambodia road sign {display} (យុទ្ធនាការចរាចរណ៍).',
            'guidance': 'Follow the rules indicated by this official sign.',
            'class_key': code,
        }
        if display in overrides:
            row.update(overrides[display])
        catalog.append(row)
    out_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=str, default=str(DEFAULT_SOURCE))
    parser.add_argument('--augments', type=int, default=AUGMENTS_PER_SIGN)
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.is_dir():
        raise SystemExit(f'Source folder not found: {source_dir}')

    by_code = collect_sources(source_dir)
    if not by_code:
        raise SystemExit('No Cambodia_road_sign*.png files found.')

    classes = sorted(by_code.keys())
    print(f'Found {len(by_code)} sign classes, {sum(len(v) for v in by_code.values())} source images')

    for sub in ('images/train', 'images/val', 'labels/train', 'labels/val'):
        shutil.rmtree(DATASET / sub, ignore_errors=True)
        (DATASET / sub).mkdir(parents=True, exist_ok=True)

    rng = random.Random(42)
    for code in classes:
        paths = by_code[code]
        class_id = classes.index(code)
        split_train = rng.random() < TRAIN_RATIO
        for src in paths:
            try:
                base_img = Image.open(src)
            except Exception as e:
                print(f'Skip {src.name}: {e}')
                continue
            for aug_i in range(args.augments):
                split = 'train' if rng.random() < TRAIN_RATIO else 'val'
                stem = f'{code}_{src.stem}_{aug_i:02d}'
                out_img = DATASET / 'images' / split / f'{stem}.jpg'
                out_lbl = DATASET / 'labels' / split / f'{stem}.txt'

                rgb, bbox = composite_sign(base_img, CANVAS)
                rgb.save(out_img, quality=92)
                xc, yc, bw, bh = bbox
                out_lbl.write_text(
                    f'{class_id} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}\n',
                    encoding='utf-8',
                )

    write_data_yaml(classes, ROOT / 'data.yaml')
    write_catalog(classes, ROOT / 'sign_catalog.json')
    train_n = len(list((DATASET / 'images/train').glob('*.jpg')))
    val_n = len(list((DATASET / 'images/val').glob('*.jpg')))
    print(f'Dataset ready: {train_n} train, {val_n} val images')
    print(f'Classes: {len(classes)} — saved to data.yaml and sign_catalog.json')


if __name__ == '__main__':
    main()
