"""Build YOLO splits from Cambodia reference sign PNG folders."""
from __future__ import annotations

import json
import random
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from _common import DATASETS_ROOT, IMAGE_EXTS, REPORTS_DIR

TRAIN_RATIO = 0.70
VAL_RATIO = 0.20

SIGN_CATEGORY_SPLITS: dict[str, str] = {
    '1-Prohibitory signs': 'cambodia_prohibitory_signs_dim_sareach',
    '2- Additional signs': 'cambodia_additional_signs_dim_sareach',
    '3-Built-up area and boundary signs': 'cambodia_builtup_boundary_dim_sareach',
    '4-Direction signs': 'cambodia_direction_signs_dim_sareach',
    '5-Information signs': 'cambodia_information_signs_dim_sareach',
    '6-Mandatory signs': 'cambodia_mandatory_signs_dim_sareach',
    '7-Priority signs': 'cambodia_priority_signs_dim_sareach',
    '8-Road markings': 'cambodia_road_markings_dim_sareach',
    '9-Signposts': 'cambodia_signposts_dim_sareach',
    '10-Street name signs': 'cambodia_street_name_signs_dim_sareach',
    '11-Temporary signs': 'cambodia_temporary_signs_dim_sareach',
    '12-Warning signs': 'cambodia_warning_signs_dim_sareach',
}


def norm_stem(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def load_stem_map(path: Path) -> dict[str, str]:
    raw = json.loads(path.read_text(encoding='utf-8'))
    return {k: v for k, v in raw.items() if not k.startswith('_')}


def content_yolo_box(img_path: Path, margin: float = 0.02) -> tuple[float, float, float, float]:
    from PIL import Image
    import numpy as np

    im = Image.open(img_path).convert('RGBA')
    arr = np.asarray(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    near_white = (rgb.min(axis=2) >= 245) & (rgb.max(axis=2) - rgb.min(axis=2) <= 12)
    foreground = (alpha > 20) & (~near_white)
    ys, xs = np.where(foreground)
    if len(xs) < 10:
        return (0.5, 0.5, 0.92, 0.92)

    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    pad_x = margin * w
    pad_y = margin * h
    x1 = max(0.0, x1 - pad_x)
    y1 = max(0.0, y1 - pad_y)
    x2 = min(float(w - 1), x2 + pad_x)
    y2 = min(float(h - 1), y2 + pad_y)
    bw = max(1.0, x2 - x1)
    bh = max(1.0, y2 - y1)
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    return (
        float(cx / w),
        float(cy / h),
        float(min(1.0, bw / w)),
        float(min(1.0, bh / h)),
    )


def collect_images(source: Path) -> list[Path]:
    return sorted(
        p for p in source.rglob('*')
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def build_items(
    images: list[Path],
    stem_map: dict[str, str],
) -> tuple[list[tuple[Path, str, dict]], list[str], list[str]]:
    class_keys = []
    for img in images:
        key = stem_map.get(norm_stem(img.stem))
        if not key:
            body = re.sub(r'[^A-Za-z0-9]+', '_', img.stem).strip('_').upper()
            if len(body) > 40:
                body = body[:40].rstrip('_')
            key = f'I_{body}' if body else 'I_SIGN'
        class_keys.append(key)

    ordered = sorted(set(class_keys))
    name_to_id = {name: i for i, name in enumerate(ordered)}
    items: list[tuple[Path, str, dict]] = []
    missing_map: list[str] = []

    for img, key in zip(images, class_keys):
        if norm_stem(img.stem) not in stem_map:
            missing_map.append(img.name)
        cid = name_to_id[key]
        cx, cy, bw, bh = content_yolo_box(img)
        label = f'{cid} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n'
        items.append((img, label, {
            'file': img.name,
            'class_id': cid,
            'class_name': key,
            'box': [round(cx, 6), round(cy, 6), round(bw, 6), round(bh, 6)],
        }))
    return items, ordered, missing_map


def split_items(items: list, seed: int) -> dict[str, list]:
    rng = random.Random(seed)
    shuffled = items[:]
    rng.shuffle(shuffled)
    n = len(shuffled)
    if n == 0:
        return {'train': [], 'val': [], 'test': []}
    if n == 1:
        return {'train': shuffled, 'val': [], 'test': []}
    if n == 2:
        return {'train': shuffled[:1], 'val': shuffled[1:], 'test': []}
    if n == 3:
        return {'train': shuffled[:1], 'val': shuffled[1:2], 'test': shuffled[2:]}
    if n == 4:
        return {'train': shuffled[:2], 'val': shuffled[2:3], 'test': shuffled[3:]}

    n_train = max(1, int(n * TRAIN_RATIO))
    n_val = max(1, int(n * VAL_RATIO))
    if n_train + n_val >= n:
        n_val = max(1, n - n_train - 1)
    return {
        'train': shuffled[:n_train],
        'val': shuffled[n_train:n_train + n_val],
        'test': shuffled[n_train + n_val:],
    }


def write_split(
    items: list[tuple[Path, str, dict]],
    class_names: list[str],
    output_root: Path,
    seed: int,
) -> dict:
    if output_root.exists():
        shutil.rmtree(output_root)
    for split in ('train', 'val', 'test'):
        (output_root / 'images' / split).mkdir(parents=True, exist_ok=True)
        (output_root / 'labels' / split).mkdir(parents=True, exist_ok=True)

    buckets = split_items(items, seed)
    counts = {k: len(v) for k, v in buckets.items()}
    by_class = {name: 0 for name in class_names}

    for split, bucket in buckets.items():
        for img, label_text, meta in bucket:
            dest_name = f"{meta['class_name']}{img.suffix.lower()}"
            dest_img = output_root / 'images' / split / dest_name
            dest_lbl = output_root / 'labels' / split / f'{Path(dest_name).stem}.txt'
            shutil.copy2(img, dest_img)
            dest_lbl.write_text(label_text, encoding='utf-8')
            by_class[meta['class_name']] += 1

    yaml_lines = [
        f'# Auto-generated {datetime.now(timezone.utc).isoformat()}',
        f'path: {output_root.as_posix()}',
        'train: images/train',
        'val: images/val',
        'test: images/test',
        f'nc: {len(class_names)}',
        'names:',
    ]
    yaml_lines.extend(f'  {i}: {name}' for i, name in enumerate(class_names))
    (output_root / 'data.yaml').write_text('\n'.join(yaml_lines) + '\n', encoding='utf-8')
    return {'counts': counts, 'by_class': by_class}


def build_category_split(
    source: Path,
    output_name: str,
    stem_map_path: Path,
    *,
    seed: int = 42,
) -> dict:
    images = collect_images(source)
    if not images:
        raise ValueError(f'No images in {source}')
    stem_map = load_stem_map(stem_map_path)
    items, class_names, missing_map = build_items(images, stem_map)
    output_root = DATASETS_ROOT / 'splits' / output_name
    stats = write_split(items, class_names, output_root, seed=seed)
    report = {
        'source': str(source),
        'output': str(output_root),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'images_total': len(images),
        'nc': len(class_names),
        'names': class_names,
        'split': stats['counts'],
        'by_class': stats['by_class'],
        'missing_from_stem_map': missing_map,
        'seed': seed,
    }
    (output_root / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report
