#!/usr/bin/env python
"""
Build a 10-class subset from the full 236-class YOLO dataset.

Usage (from repo root):
  python scripts/build_dataset_10.py
  python scripts/build_dataset_10.py --dry-run
"""
from __future__ import annotations

import argparse
import csv
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'

SOURCE_ROOT = AI_ROOT / 'dataset'
OUTPUT_ROOT = AI_ROOT / 'dataset_10'
DATA_YAML_SRC = AI_ROOT / 'data.yaml'
REPORT_DIR = ROOT / 'docs' / 'reports'

# New class order (new_id -> class_name)
TARGET_CLASSES: list[str] = [
    'NO_ENTRY',
    'NO_LEFT_TURN',
    'NO_RIGHT_TURN',
    'NO_U_TURN',
    'NO_PARKING',
    'M_STOP',
    'P_SPEED_LIMIT_20_KM_H',
    'P_SPEED_LIMIT_50_KM_H',
    'W_PEDESTRIAN_CROSSING',
    'I_ONE_WAY_TRAFFIC',
]

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}


@dataclass
class ClassStats:
    class_name: str
    original_class_id: int
    new_class_id: int
    image_count: int = 0
    train_count: int = 0
    val_count: int = 0
    mismatches: list[str] = field(default_factory=list)


def load_yaml_names(yaml_path: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    if not yaml_path.is_file():
        raise FileNotFoundError(f'Missing {yaml_path}')
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'\s*(\d+):\s*(\S+)', line)
        if m:
            names[int(m.group(1))] = m.group(2)
    return names


def build_class_maps(names: dict[int, str]) -> tuple[dict[str, int], dict[int, int], dict[int, str]]:
    """Return name->old_id, old_id->new_id, new_id->name."""
    name_to_old: dict[str, int] = {}
    for old_id, class_name in names.items():
        if class_name in TARGET_CLASSES:
            name_to_old[class_name] = old_id

    missing = [c for c in TARGET_CLASSES if c not in name_to_old]
    if missing:
        raise ValueError(f'Classes not found in data.yaml: {missing}')

    old_to_new = {name_to_old[name]: idx for idx, name in enumerate(TARGET_CLASSES)}
    new_to_name = {idx: name for idx, name in enumerate(TARGET_CLASSES)}
    return name_to_old, old_to_new, new_to_name


def parse_label_lines(label_path: Path) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    if not label_path.is_file():
        return rows
    for line in label_path.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        parts = stripped.split()
        rows.append((int(parts[0]), ' '.join(parts[1:])))
    return rows


def remap_label_lines(
    rows: list[tuple[int, str]],
    *,
    old_to_new: dict[int, int],
    allowed_old_ids: set[int],
) -> list[tuple[int, str]]:
    remapped: list[tuple[int, str]] = []
    for old_id, coords in rows:
        if old_id not in allowed_old_ids:
            raise ValueError(f'Label uses non-target class id {old_id}')
        remapped.append((old_to_new[old_id], coords))
    return remapped


def find_image(images_dir: Path, stem: str) -> Path | None:
    for ext in IMAGE_EXTS:
        candidate = images_dir / f'{stem}{ext}'
        if candidate.is_file():
            return candidate
    return None


def class_from_dataset_stem(stem: str, names: dict[int, str], target_set: set[str]) -> str | None:
    """Match dataset image stem prefix to a known YOLO class (longest name first)."""
    for class_name in sorted(set(names.values()), key=len, reverse=True):
        if stem == class_name or stem.startswith(f'{class_name}_'):
            return class_name if class_name in target_set else None
    return None


def verify_image_class(
    image_path: Path,
    *,
    expected_class: str,
    label_old_ids: set[int],
    name_to_old: dict[str, int],
    names: dict[int, str],
    target_set: set[str],
) -> str | None:
    """Return error message if filename class disagrees with label class."""
    filename_class = class_from_dataset_stem(image_path.stem, names, target_set)
    if filename_class is None:
        return f'could not resolve class prefix from filename stem {image_path.stem!r}'
    if filename_class != expected_class:
        return (
            f'filename class {filename_class!r} != label class {expected_class!r}'
        )
    expected_old = name_to_old[expected_class]
    if label_old_ids != {expected_old}:
        return f'label ids {sorted(label_old_ids)} != expected {{{expected_old}}}'
    return None


def write_dataset_files(
    output_root: Path,
    new_to_name: dict[int, str],
    *,
    source_yaml: Path,
) -> None:
    classes_txt = output_root / 'classes.txt'
    classes_txt.write_text(
        '\n'.join(new_to_name[i] for i in range(len(new_to_name))) + '\n',
        encoding='utf-8',
    )

    # Preserve path style from source data.yaml when possible.
    path_value = str(output_root.resolve()).replace('\\', '/')
    names_block = '\n'.join(f'  {i}: {new_to_name[i]}' for i in range(len(new_to_name)))
    data_yaml = f"""# 10-class subset — auto-generated
path: {path_value}
train: images/train
val: images/val
nc: {len(new_to_name)}
names:
{names_block}
"""
    (output_root / 'data.yaml').write_text(data_yaml, encoding='utf-8')


def write_report(
    stats: list[ClassStats],
    *,
    output_root: Path,
    verification_errors: list[str],
    total_images: int,
) -> tuple[Path, Path]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    md_path = REPORT_DIR / f'DATASET_10_BUILD_REPORT_{stamp}.md'
    csv_path = REPORT_DIR / f'dataset_10_class_summary_{stamp}.csv'

    lines = [
        '# Dataset 10 Build Report',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        f'Source: `{SOURCE_ROOT}`',
        f'Output: `{output_root}`',
        f'Total images copied: **{total_images}**',
        f'Verification errors: **{len(verification_errors)}**',
        '',
        '## Class Summary',
        '',
        '| Class Name | Original Class ID | New Class ID | Number of Images | Train | Val |',
        '|------------|-------------------|--------------|------------------|-------|-----|',
    ]
    with csv_path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        writer.writerow([
            'Class Name', 'Original Class ID', 'New Class ID',
            'Number of Images', 'Train', 'Val', 'Verification Issues',
        ])
        for row in stats:
            issues = len(row.mismatches)
            lines.append(
                f'| {row.class_name} | {row.original_class_id} | {row.new_class_id} '
                f'| {row.image_count} | {row.train_count} | {row.val_count} |'
            )
            writer.writerow([
                row.class_name,
                row.original_class_id,
                row.new_class_id,
                row.image_count,
                row.train_count,
                row.val_count,
                issues,
            ])

    lines.extend(['', '## Verification', ''])
    if verification_errors:
        lines.append('The following issues were found:')
        lines.append('')
        for err in verification_errors:
            lines.append(f'- {err}')
    else:
        lines.append('All images passed filename ↔ label class verification.')

    per_class_issues = [s for s in stats if s.mismatches]
    if per_class_issues:
        lines.extend(['', '### Per-class mismatch detail', ''])
        for s in per_class_issues:
            lines.append(f'**{s.class_name}**')
            for msg in s.mismatches:
                lines.append(f'- {msg}')
            lines.append('')

    md_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return md_path, csv_path


def build_dataset(*, dry_run: bool = False) -> int:
    if not SOURCE_ROOT.is_dir():
        raise FileNotFoundError(f'Source dataset not found: {SOURCE_ROOT}')

    names = load_yaml_names(DATA_YAML_SRC)
    name_to_old, old_to_new, new_to_name = build_class_maps(names)
    allowed_old_ids = set(old_to_new.keys())
    target_set = set(TARGET_CLASSES)

    stats_by_class: dict[str, ClassStats] = {
        name: ClassStats(
            class_name=name,
            original_class_id=name_to_old[name],
            new_class_id=idx,
        )
        for idx, name in enumerate(TARGET_CLASSES)
    }

    verification_errors: list[str] = []
    copied = 0
    seen_stems: set[tuple[str, str]] = set()

    if not dry_run:
        if OUTPUT_ROOT.exists():
            shutil.rmtree(OUTPUT_ROOT)
        for split in ('train', 'val'):
            (OUTPUT_ROOT / 'images' / split).mkdir(parents=True, exist_ok=True)
            (OUTPUT_ROOT / 'labels' / split).mkdir(parents=True, exist_ok=True)

    for split in ('train', 'val'):
        labels_dir = SOURCE_ROOT / 'labels' / split
        images_dir = SOURCE_ROOT / 'images' / split
        if not labels_dir.is_dir():
            continue

        for label_path in sorted(labels_dir.glob('*.txt')):
            rows = parse_label_lines(label_path)
            if not rows:
                continue

            old_ids = {old_id for old_id, _ in rows}
            if not old_ids.issubset(allowed_old_ids):
                continue

            # Single-class images only (all boxes must share one target class).
            if len(old_ids) != 1:
                verification_errors.append(
                    f'{split}/{label_path.name}: multiple target classes in one image: {sorted(old_ids)}'
                )
                continue

            old_id = next(iter(old_ids))
            class_name = names[old_id]
            stat = stats_by_class[class_name]

            image_path = find_image(images_dir, label_path.stem)
            if image_path is None:
                verification_errors.append(f'{split}/{label_path.stem}: image file missing')
                continue

            err = verify_image_class(
                image_path,
                expected_class=class_name,
                label_old_ids=old_ids,
                name_to_old=name_to_old,
                names=names,
                target_set=target_set,
            )
            if err:
                msg = f'{split}/{image_path.name}: {err}'
                verification_errors.append(msg)
                stat.mismatches.append(msg)
                continue

            key = (split, label_path.stem)
            if key in seen_stems:
                continue
            seen_stems.add(key)

            remapped = remap_label_lines(rows, old_to_new=old_to_new, allowed_old_ids=allowed_old_ids)
            stat.image_count += 1
            if split == 'train':
                stat.train_count += 1
            else:
                stat.val_count += 1
            copied += 1

            if dry_run:
                continue

            dest_image = OUTPUT_ROOT / 'images' / split / image_path.name
            dest_label = OUTPUT_ROOT / 'labels' / split / f'{label_path.stem}.txt'
            shutil.copy2(image_path, dest_image)
            label_text = '\n'.join(f'{new_id} {coords}' for new_id, coords in remapped) + '\n'
            dest_label.write_text(label_text, encoding='utf-8')

    stats = [stats_by_class[name] for name in TARGET_CLASSES]

    if not dry_run:
        write_dataset_files(OUTPUT_ROOT, new_to_name, source_yaml=DATA_YAML_SRC)

    md_path, csv_path = write_report(
        stats,
        output_root=OUTPUT_ROOT,
        verification_errors=verification_errors,
        total_images=copied,
    )

    print(f'Source dataset: {SOURCE_ROOT}')
    print(f'Output dataset: {OUTPUT_ROOT}')
    print(f'Images selected: {copied}')
    print(f'Verification errors: {len(verification_errors)}')
    print(f'Report: {md_path}')
    print(f'CSV: {csv_path}')
    print()
    print(f'{"Class Name":<28} {"Orig ID":>7} {"New ID":>6} {"Images":>7} {"Train":>6} {"Val":>4}')
    print('-' * 66)
    for row in stats:
        print(
            f'{row.class_name:<28} {row.original_class_id:>7} {row.new_class_id:>6} '
            f'{row.image_count:>7} {row.train_count:>6} {row.val_count:>4}'
        )

    return 1 if verification_errors else 0


def main() -> None:
    parser = argparse.ArgumentParser(description='Build 10-class YOLO subset dataset')
    parser.add_argument('--dry-run', action='store_true', help='Scan and report only; do not write dataset')
    args = parser.parse_args()
    rc = build_dataset(dry_run=args.dry_run)
    if rc:
        print('\nCompleted with verification issues — review report before training.')
    else:
        print('\nDataset built successfully. Training not started.')


if __name__ == '__main__':
    main()
