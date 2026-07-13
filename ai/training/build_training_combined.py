#!/usr/bin/env python
"""
Merge sign, vehicle, and plate splits into training_combined (31-class layout).

Usage:
  python ai/training/build_training_combined.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))

from _common import DATASETS_ROOT, IMAGE_EXTS

SPLITS = {
    'cambodia_traffic_reference_remapped': None,
    'cambodia_vehicle_reference_remapped': {0: 15, 1: 10, 2: 13, 3: 16, 4: 14},
    'plate_number_reference_remapped': {0: 19, 1: 20, 2: 21},
}
OUT = DATASETS_ROOT / 'splits' / 'training_combined'


def remap_label(text: str, id_map: dict[int, int] | None) -> str:
    lines = []
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        parts = line.split()
        cls = int(parts[0])
        if id_map:
            cls = id_map.get(cls, cls)
        parts[0] = str(cls)
        lines.append(' '.join(parts))
    return '\n'.join(lines) + ('\n' if lines else '')


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    class_map = json.loads((DATASETS_ROOT / 'labels' / 'yolo' / 'class-map.json').read_text(encoding='utf-8'))
    names = {int(k): v for k, v in class_map['names'].items()}

    for split_name, mapping in SPLITS.items():
        src = DATASETS_ROOT / 'splits' / split_name
        if not src.is_dir():
            print(f'Skip missing: {src}')
            continue
        id_map = mapping if isinstance(mapping, dict) else None
        for split in ('train', 'val', 'test'):
            img_dir = src / 'images' / split
            lbl_dir = src / 'labels' / split
            if not img_dir.is_dir():
                continue
            for img in img_dir.glob('*'):
                if img.suffix.lower() not in IMAGE_EXTS:
                    continue
                lbl = lbl_dir / f'{img.stem}.txt'
                if not lbl.is_file():
                    continue
                prefix = f'{split_name[:4]}_{img.name}'
                dest_img = OUT / 'images' / split / prefix
                dest_lbl = OUT / 'labels' / split / f'{Path(prefix).stem}.txt'
                dest_img.parent.mkdir(parents=True, exist_ok=True)
                dest_lbl.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(img, dest_img)
                dest_lbl.write_text(remap_label(lbl.read_text(encoding='utf-8'), id_map), encoding='utf-8')

    lines = [
        f'path: {OUT.resolve().as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        f'nc: {len(names)}',
        'names:',
    ]
    for idx in sorted(names):
        lines.append(f'  {idx}: {names[idx]}')
    (OUT / 'data.yaml').write_text('\n'.join(lines) + '\n', encoding='utf-8')

    total = sum(1 for _ in (OUT / 'images').rglob('*') if _.suffix.lower() in IMAGE_EXTS)
    print(f'training_combined: {total} images → {OUT}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
