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
CAMBODIA_REFERENCE_ROOT = (
    ROOT.parent.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'Road signs in Cambodia'
)
META_PATH = ROOT / 'reference_sign_meta.json'
STEM_MAP_PATH = ROOT / 'cambodia_stem_to_class.json'
DEFAULT_SOURCES = (CAMBODIA_REFERENCE_ROOT,)

# Normalized filename stem → YOLO class_key (01-Sign + 02-Sign reference art)
STEM_TO_CLASS: dict[str, str] = {
    'closeforallroadusers': 'ROAD_CLOSED_ALL_USERS',
    'closeforallvehicles': 'ROAD_CLOSED_ALL_VEHICLES',
    'heightlimit': 'HEIGHT_LIMIT',
    'noleftturn': 'NO_LEFT_TURN',
    'noparking': 'NO_PARKING',
    'norightturn': 'NO_RIGHT_TURN',
    'nouturn': 'NO_U_TURN',
    'totalweightlimit': 'TOTAL_WEIGHT_LIMIT',
    'weightlimitononeaxle': 'AXLE_WEIGHT_LIMIT',
    'widthlimit': 'WIDTH_LIMIT',
    'lenghtlimit': 'LENGTH_LIMIT',
    'lengthlimit': 'LENGTH_LIMIT',
    'noentry': 'NO_ENTRY',
    'noentryformotorcycle': 'NO_ENTRY_FOR_MOTORCYCLE',
    'noentryformotorvehiclesexceptmotorcycleswithoutsidecarts': 'NO_ENTRY_MOTOR_EXCEPT_MOTORCYCLE',
    'noentryforbicyclemotorcycleandtricycle': 'NO_ENTRY_BICYCLE_MOTORCYCLE_TRICYCLE',
    'noentryforbicycle': 'NO_ENTRY_BICYCLE',
    'noentryforlargedsizedbus': 'NO_ENTRY_LARGE_BUS',
    'noentryforlargedsizedtruck': 'NO_ENTRY_LARGE_TRUCK',
    'noentryformotorvehicles': 'NO_ENTRY_MOTOR_VEHICLES',
    'noentryformotorcycledrawnvehicles': 'NO_ENTRY_MOTORCYCLE_DRAWN',
    'nostopping': 'NO_STOPPING',
}
DATASET = ROOT / 'dataset'
AUGMENTS_PER_SIGN = 12
TRAIN_RATIO = 0.85
CANVAS = 640
SIGN_CODE_RE = re.compile(
    r'Cambodia_road_sign_([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+[a-z]?)(?:\([^)]*\))?',
    re.IGNORECASE,
)


def _norm_stem(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def parse_sign_code(filename: str) -> str | None:
    m = SIGN_CODE_RE.search(filename)
    if not m:
        return None
    return m.group(1).upper().replace('-', '_')


def _load_stem_map() -> dict[str, str]:
    if not STEM_MAP_PATH.is_file():
        return {}
    try:
        import json
        raw = json.loads(STEM_MAP_PATH.read_text(encoding='utf-8'))
        return {k: v for k, v in raw.items() if not k.startswith('_')}
    except json.JSONDecodeError:
        return {}


def class_key_from_path(path: Path, stem_map: dict[str, str] | None = None) -> str | None:
    stem_map = stem_map or _load_stem_map()
    mapped = stem_map.get(_norm_stem(path.stem))
    if mapped:
        return mapped
    code = parse_sign_code(path.name)
    if code:
        return code
    mapped = STEM_TO_CLASS.get(_norm_stem(path.stem))
    if mapped:
        return mapped
    fallback = re.sub(r'[^A-Za-z0-9]+', '_', path.stem).strip('_').upper()
    return fallback or None


def category_for_code(code: str) -> str:
    reference_meta = load_reference_meta()
    if code in reference_meta and reference_meta[code].get('category'):
        return reference_meta[code]['category']
    if code.startswith('PW') or '_R' in code:
        return 'prohibitory'
    if code.startswith('P_'):
        return 'prohibitory'
    if code.startswith('W_'):
        return 'warning'
    if code.startswith('M_'):
        return 'mandatory'
    if code.startswith('I_'):
        return 'informative'
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
        bg = Image.new(
            'RGB',
            (canvas_size, canvas_size),
            (random.randint(55, 85), random.randint(55, 85), random.randint(60, 90)),
        )
    x = random.randint(20, max(20, canvas_size - sign.width - 20))
    y = random.randint(20, max(20, canvas_size - sign.height - 20))
    bg.paste(sign, (x, y), sign)

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


def _yolo_skip_folders() -> set[str]:
    if not STEM_MAP_PATH.is_file():
        return {'Road markings'}
    try:
        import json
        raw = json.loads(STEM_MAP_PATH.read_text(encoding='utf-8'))
        return set(raw.get('_yolo_skip_folders', ['Road markings']))
    except json.JSONDecodeError:
        return {'Road markings'}


def collect_sources(source_dir: Path, *, skip_folders: set[str] | None = None) -> dict[str, list[Path]]:
    by_code: dict[str, list[Path]] = {}
    stem_map = _load_stem_map()
    skip_folders = skip_folders if skip_folders is not None else _yolo_skip_folders()
    image_paths: list[Path] = []
    for ext in ('*.png', '*.jpg', '*.jpeg', '*.avif', '*.webp', '*.bmp'):
        image_paths.extend(sorted(source_dir.rglob(ext)))
    for path in image_paths:
        if skip_folders:
            rel_parts = path.relative_to(source_dir).parts
            if rel_parts and rel_parts[0] in skip_folders:
                continue
        code = class_key_from_path(path, stem_map)
        if not code:
            continue
        by_code.setdefault(code, []).append(path)
    return by_code


FOLDER_TO_CATEGORY = {
    'Prohibitory signs': 'prohibitory',
    'Warning signs': 'warning',
    'Mandatory signs': 'mandatory',
    'Priority signs': 'mandatory',
    'Information signs': 'informative',
    'Direction signs': 'informative',
    'Temporary signs': 'warning',
    'Built-up area and boundary signs': 'informative',
    'Additional signs': 'informative',
    'Signposts': 'informative',
    'Street name signs': 'informative',
    'Road markings': 'informative',
}


def _source_folder_tag(source_dir: Path) -> str:
    """e.g. 01-Sign -> 01_SIGN (used when the same class appears in both folders)."""
    return re.sub(r'[^A-Za-z0-9]+', '_', source_dir.name).strip('_').upper()


def merge_source_maps(
    *sources: tuple[Path, dict[str, list[Path]]],
) -> dict[str, list[Path]]:
    """Merge 01-Sign + 02-Sign; duplicate class keys get a folder suffix (20 images → 20 classes)."""
    merged: dict[str, list[Path]] = {}
    for source_dir, mapping in sources:
        tag = _source_folder_tag(source_dir)
        for code, paths in mapping.items():
            key = code
            if key in merged:
                key = f'{code}__{tag}'
            merged.setdefault(key, []).extend(paths)
    return merged


def write_data_yaml(classes: list[str], out_path: Path) -> None:
    dataset_root = DATASET.resolve().as_posix()
    lines = [
        '# Auto-generated from Cambodia reference signs',
        f'path: {dataset_root}',
        'train: images/train',
        'val: images/val',
        f'nc: {len(classes)}',
        'names:',
    ]
    for i, name in enumerate(classes):
        lines.append(f'  {i}: {name}')
    out_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def load_reference_meta() -> dict[str, dict]:
    if not META_PATH.is_file():
        return {}
    import json

    try:
        return json.loads(META_PATH.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return {}


def write_catalog(classes: list[str], out_path: Path) -> None:
    import json

    reference_meta = load_reference_meta()
    catalog = []
    for code in classes:
        meta = reference_meta.get(code, {})
        display = meta.get('sign_code') or code.replace('_', '-')
        if len(display) > 20:
            display = display[:20]
        row = {
            'sign_code': display,
            'sign_name': meta.get('sign_name_km') or meta.get('sign_name_en') or f'Traffic Sign {display}',
            'sign_name_km': meta.get('sign_name_km', ''),
            'sign_name_en': meta.get('sign_name_en', ''),
            'category': meta.get('category') or category_for_code(code),
            'description': meta.get('description', f'Cambodia road sign {display}.'),
            'description_en': meta.get('description_en', ''),
            'guidance': meta.get('guidance', 'Follow the rules indicated by this official sign.'),
            'guidance_en': meta.get('guidance_en', ''),
            'class_key': code,
        }
        catalog.append(row)
    out_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--source',
        action='append',
        dest='sources',
        default=[],
        help='Sign image folder (repeat for multiple, e.g. 01-Sign and 02-Sign)',
    )
    parser.add_argument('--augments', type=int, default=AUGMENTS_PER_SIGN)
    parser.add_argument(
        '--max-train',
        type=int,
        default=0,
        help='Stop after N training images (e.g. 5 for a quick pilot). 0 = no limit.',
    )
    parser.add_argument(
        '--max-val',
        type=int,
        default=0,
        help='Stop after N validation images. 0 = auto split.',
    )
    parser.add_argument(
        '--only-code',
        type=str,
        default='',
        help='Comma-separated sign codes only (e.g. PW03-R1-01).',
    )
    args = parser.parse_args()

    source_dirs = [Path(s) for s in args.sources] if args.sources else list(DEFAULT_SOURCES)
    source_dirs = [d for d in source_dirs if d.is_dir()]
    if not source_dirs:
        raise SystemExit(
            'No source folders found. Run: python ingest_cambodia_reference.py\n'
            'Or use --source "D:/.../Road signs in Cambodia"'
        )

    by_code = merge_source_maps(*((d, collect_sources(d)) for d in source_dirs))
    if not by_code:
        raise SystemExit('No supported image files found in source folder(s).')
    print('Sources:', ', '.join(d.name for d in source_dirs))

    if args.only_code:
        allowed = {c.strip().upper().replace('_', '-') for c in args.only_code.split(',') if c.strip()}
        by_code = {
            k: v
            for k, v in by_code.items()
            if k.replace('_', '-') in allowed or k in {a.replace('-', '_') for a in allowed}
        }
        if not by_code:
            raise SystemExit(f'No images found for code(s): {args.only_code}')

    classes = sorted(by_code.keys())
    print(f'Found {len(by_code)} sign classes, {sum(len(v) for v in by_code.values())} source images')
    if args.max_train:
        print(f'Pilot mode: up to {args.max_train} train images')

    for sub in ('images/train', 'images/val', 'labels/train', 'labels/val'):
        shutil.rmtree(DATASET / sub, ignore_errors=True)
        (DATASET / sub).mkdir(parents=True, exist_ok=True)

    rng = random.Random(42)
    train_count = val_count = 0
    used_classes: list[str] = []
    stop_all = False

    for code in classes:
        if stop_all:
            break
        paths = by_code[code]
        class_used = False
        for src in paths:
            if stop_all:
                break
            try:
                base_img = Image.open(src)
            except Exception as e:
                print(f'Skip {src.name}: {e}')
                continue
            for aug_i in range(args.augments):
                want_train = args.max_train == 0 or train_count < args.max_train
                want_val = args.max_val == 0 or val_count < args.max_val
                if not want_train and not want_val:
                    stop_all = True
                    break
                if want_train and (args.max_val or rng.random() < TRAIN_RATIO):
                    split = 'train'
                elif want_val:
                    split = 'val'
                elif want_train:
                    split = 'train'
                else:
                    continue

                class_id = len(used_classes) if code not in used_classes else used_classes.index(code)
                if code not in used_classes:
                    used_classes.append(code)

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
                class_used = True
                if split == 'train':
                    train_count += 1
                else:
                    val_count += 1

        if not class_used and args.max_train:
            continue

    if not used_classes:
        raise SystemExit('No images were generated. Check --source path.')

    write_data_yaml(used_classes, ROOT / 'data.yaml')
    write_catalog(used_classes, ROOT / 'sign_catalog.json')
    if args.only_code:
        print(f'Single-sign catalog written for: {", ".join(used_classes)}')
    train_n = len(list((DATASET / 'images/train').glob('*.jpg')))
    val_n = len(list((DATASET / 'images/val').glob('*.jpg')))
    print(f'Dataset ready: {train_n} train, {val_n} val images')
    print(f'Classes in data.yaml: {len(used_classes)}')


if __name__ == '__main__':
    main()
