#!/usr/bin/env python
"""
Read-only quality audit for the Cambodian traffic sign YOLO dataset (236 classes).

Checks: image quality, duplicates, missing labels/images, label/filename mismatches,
class imbalance, invalid YOLO boxes. Does NOT modify the dataset.

Usage (from repo root):
  python scripts/audit_dataset_quality.py
  python scripts/audit_dataset_quality.py --dataset ai/dataset_10
  python scripts/audit_dataset_quality.py --blur-threshold 80
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'
REPORT_DIR = ROOT / 'docs' / 'reports'

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
BLUR_LOW_THRESHOLD = 80.0
BRIGHTNESS_LOW = 45.0
BRIGHTNESS_HIGH = 220.0
IMBALANCE_WARN = 5
IMBALANCE_CRITICAL = 2


@dataclass
class ImageRecord:
    split: str
    stem: str
    image_path: Path
    label_path: Path | None
    class_ids: list[int]
    class_names: list[str]
    filename_class: str | None
    blur_score: float | None = None
    brightness: float | None = None
    width: int = 0
    height: int = 0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class ClassReport:
    class_name: str
    class_id: int
    image_count: int = 0
    label_count: int = 0
    train_images: int = 0
    val_images: int = 0
    possible_errors: list[str] = field(default_factory=list)
    recommended_fixes: list[str] = field(default_factory=list)


def load_yaml_names(yaml_path: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    if not yaml_path.is_file():
        raise FileNotFoundError(f'Missing {yaml_path}')
    in_names = False
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        if line.strip().startswith('names:'):
            in_names = True
            continue
        if not in_names:
            continue
        if not line.startswith('  '):
            break
        m = re.match(r'\s+(\d+):\s*(.+)\s*$', line)
        if m:
            names[int(m.group(1))] = m.group(2).strip()
    return names


def class_from_dataset_stem(stem: str, all_class_names: list[str]) -> str | None:
    for class_name in sorted(all_class_names, key=len, reverse=True):
        if stem == class_name or stem.startswith(f'{class_name}_'):
            return class_name
    return None


def find_image(images_dir: Path, stem: str) -> Path | None:
    for ext in IMAGE_EXTS:
        candidate = images_dir / f'{stem}{ext}'
        if candidate.is_file():
            return candidate
    return None


def parse_label_file(label_path: Path) -> list[tuple[int, tuple[float, float, float, float]]]:
    rows: list[tuple[int, tuple[float, float, float, float]]] = []
    if not label_path.is_file():
        return rows
    for line in label_path.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        parts = stripped.split()
        if len(parts) < 5:
            continue
        cls = int(parts[0])
        coords = tuple(float(v) for v in parts[1:5])
        rows.append((cls, coords))
    return rows


def validate_box(coords: tuple[float, float, float, float]) -> list[str]:
    issues: list[str] = []
    cx, cy, w, h = coords
    if not (0 <= cx <= 1 and 0 <= cy <= 1):
        issues.append('center out of [0,1]')
    if w <= 0 or h <= 0:
        issues.append('non-positive width/height')
    if w > 1 or h > 1:
        issues.append('box larger than image')
    x1, y1 = cx - w / 2, cy - h / 2
    x2, y2 = cx + w / 2, cy + h / 2
    if x1 < -0.01 or y1 < -0.01 or x2 > 1.01 or y2 > 1.01:
        issues.append('box extends outside image')
    if w * h < 0.005:
        issues.append('very small box (<0.5% area)')
    if w * h > 0.98:
        issues.append('box covers nearly entire image')
    return issues


def image_metrics(image_path: Path) -> tuple[float, float, int, int]:
    try:
        import cv2
    except ImportError:
        return 0.0, 128.0, 0, 0

    img = cv2.imread(str(image_path))
    if img is None:
        return 0.0, 0.0, 0, 0
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray))
    return blur, brightness, w, h


def file_md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def perceptual_hash(path: Path, size: int = 16) -> str | None:
    try:
        import cv2
    except ImportError:
        return None
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    resized = cv2.resize(img, (size + 1, size), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    return ''.join('1' if bit else '0' for bit in diff.flatten())


def hamming(a: str, b: str) -> int:
    return sum(x != y for x, y in zip(a, b))


def scan_dataset(
    dataset_root: Path,
    names: dict[int, str],
    *,
    blur_threshold: float,
) -> tuple[list[ImageRecord], list[str], dict[str, list[Path]]]:
    all_class_names = list(names.values())
    id_to_name = names
    records: list[ImageRecord] = []
    global_issues: list[str] = []
    orphan_labels: list[str] = []
    seen_stems: set[tuple[str, str]] = set()

    for split in ('train', 'val'):
        images_dir = dataset_root / 'images' / split
        labels_dir = dataset_root / 'labels' / split
        if not images_dir.is_dir():
            global_issues.append(f'Missing images/{split} directory')
            continue

        image_stems = set()
        for img_path in sorted(images_dir.iterdir()):
            if img_path.suffix.lower() not in IMAGE_EXTS:
                continue
            stem = img_path.stem
            image_stems.add(stem)
            key = (split, stem)
            if key in seen_stems:
                global_issues.append(f'Duplicate stem in split {split}: {stem}')
            seen_stems.add(key)

            label_path = labels_dir / f'{stem}.txt'
            label_rows = parse_label_file(label_path) if label_path.is_file() else []
            class_ids = [row[0] for row in label_rows]
            class_names = [id_to_name.get(cid, f'UNKNOWN_{cid}') for cid in class_ids]
            filename_class = class_from_dataset_stem(stem, all_class_names)

            rec = ImageRecord(
                split=split,
                stem=stem,
                image_path=img_path,
                label_path=label_path if label_path.is_file() else None,
                class_ids=class_ids,
                class_names=class_names,
                filename_class=filename_class,
            )

            if not label_path.is_file():
                rec.errors.append('missing label file')
            elif not label_rows:
                rec.errors.append('empty label file')

            if filename_class is None:
                rec.warnings.append('filename class prefix not recognized')
            elif class_ids and len(set(class_ids)) == 1:
                expected_id = next((i for i, n in id_to_name.items() if n == filename_class), None)
                if expected_id is not None and class_ids[0] != expected_id:
                    rec.errors.append(
                        f'label class {id_to_name.get(class_ids[0], class_ids[0])} '
                        f'!= filename class {filename_class}',
                    )
            elif len(set(class_ids)) > 1:
                rec.errors.append(f'multiple classes in one label: {sorted(set(class_names))}')

            for idx, (cls_id, coords) in enumerate(label_rows):
                if cls_id not in id_to_name:
                    rec.errors.append(f'unknown class id {cls_id} in label line {idx + 1}')
                box_issues = validate_box(coords)
                for issue in box_issues:
                    rec.warnings.append(f'box {idx + 1}: {issue}')

            blur, brightness, w, h = image_metrics(img_path)
            rec.blur_score = blur
            rec.brightness = brightness
            rec.width = w
            rec.height = h
            if blur > 0 and blur < blur_threshold:
                rec.warnings.append(f'low sharpness (Laplacian={blur:.1f})')
            if brightness < BRIGHTNESS_LOW:
                rec.warnings.append(f'dark image (mean={brightness:.1f})')
            if brightness > BRIGHTNESS_HIGH:
                rec.warnings.append(f'overexposed (mean={brightness:.1f})')
            if w < 64 or h < 64:
                rec.warnings.append(f'low resolution ({w}×{h})')

            records.append(rec)

        if labels_dir.is_dir():
            for label_path in sorted(labels_dir.glob('*.txt')):
                if label_path.stem not in image_stems:
                    orphan_labels.append(f'{split}/{label_path.name}')

    duplicate_groups: dict[str, list[Path]] = defaultdict(list)
    md5_map: dict[str, list[Path]] = defaultdict(list)
    for rec in records:
        digest = file_md5(rec.image_path)
        md5_map[digest].append(rec.image_path)

    for digest, paths in md5_map.items():
        if len(paths) > 1:
            duplicate_groups[f'exact_md5_{digest[:8]}'] = paths

    # Near-duplicate detection within same class (perceptual hash)
    by_class: dict[str, list[ImageRecord]] = defaultdict(list)
    for rec in records:
        key = rec.filename_class or rec.class_names[0] if rec.class_names else '_unknown'
        by_class[key].append(rec)

    for class_key, class_recs in by_class.items():
        hashes: list[tuple[str, Path]] = []
        for rec in class_recs:
            ph = perceptual_hash(rec.image_path)
            if ph:
                hashes.append((ph, rec.image_path))
        for i, (h1, p1) in enumerate(hashes):
            for h2, p2 in hashes[i + 1:]:
                if hamming(h1, h2) <= 6:
                    group_key = f'near_dup_{class_key}_{p1.stem}_{p2.stem}'
                    duplicate_groups[group_key] = [p1, p2]

    if orphan_labels:
        global_issues.append(f'{len(orphan_labels)} label(s) without matching image')

    return records, global_issues + orphan_labels[:20], duplicate_groups


def build_class_reports(
    records: list[ImageRecord],
    names: dict[int, str],
    duplicate_groups: dict[str, list[Path]],
) -> list[ClassReport]:
    reports: dict[str, ClassReport] = {
        class_name: ClassReport(class_name=class_name, class_id=class_id)
        for class_id, class_name in names.items()
    }

    images_per_class: dict[str, set[str]] = defaultdict(set)
    label_lines_per_class: dict[str, int] = defaultdict(int)
    errors_per_class: dict[str, list[str]] = defaultdict(list)
    unknown_images = 0

    for rec in records:
        if rec.filename_class and rec.filename_class in reports:
            images_per_class[rec.filename_class].add(f'{rec.split}/{rec.stem}')
        elif not rec.class_ids:
            unknown_images += 1

        for cls_id in rec.class_ids:
            cname = names.get(cls_id, f'UNKNOWN_{cls_id}')
            if cname not in reports:
                reports[cname] = ClassReport(class_name=cname, class_id=cls_id)
            label_lines_per_class[cname] += 1
            images_per_class[cname].add(f'{rec.split}/{rec.stem}')

        classes_to_tag = set(rec.class_names)
        if rec.filename_class:
            classes_to_tag.add(rec.filename_class)
        for cname in classes_to_tag:
            for err in rec.errors + rec.warnings:
                snippet = f'{rec.split}/{rec.image_path.name}: {err}'
                bucket = errors_per_class[cname]
                if snippet not in bucket and len(bucket) < 8:
                    bucket.append(snippet)

    for class_name, row in reports.items():
        imgs = images_per_class.get(class_name, set())
        row.image_count = len(imgs)
        row.label_count = label_lines_per_class.get(class_name, 0)
        row.train_images = sum(1 for k in imgs if k.startswith('train/'))
        row.val_images = sum(1 for k in imgs if k.startswith('val/'))
        row.possible_errors = list(errors_per_class.get(class_name, []))

        if row.image_count == 0:
            row.possible_errors.append('no images in dataset')
            row.recommended_fixes.append('Add reference images or verify data.yaml class name')
        elif row.image_count < IMBALANCE_CRITICAL:
            row.possible_errors.append(f'severe class imbalance ({row.image_count} images)')
            row.recommended_fixes.append('Collect at least 20–50 diverse images per class before retraining')
        elif row.image_count < IMBALANCE_WARN:
            row.possible_errors.append(f'low sample count ({row.image_count} images)')
            row.recommended_fixes.append('Add augmented and real-world photos; aim for ≥20 per class')

        if row.val_images == 0 and row.image_count > 0:
            row.possible_errors.append('no validation images')
            row.recommended_fixes.append('Move or add 15–20% of images to val split')

        dup_for_class = sum(
            1 for paths in duplicate_groups.values()
            if any(class_name in p.stem for p in paths)
        )
        if dup_for_class:
            row.possible_errors.append(f'{dup_for_class} duplicate/near-duplicate group(s)')
            row.recommended_fixes.append('Review duplicate pairs; keep one canonical image per augmentation')

        err_text = ' '.join(row.possible_errors).lower()
        if 'label' in err_text and 'filename' in err_text:
            row.recommended_fixes.append('Fix YOLO label class id to match filename prefix (manual review)')
        if 'sharpness' in err_text or 'dark' in err_text or 'overexposed' in err_text:
            row.recommended_fixes.append('Replace with sharper, well-lit reference captures')

    if unknown_images:
        reports['_UNMATCHED_FILENAME'] = ClassReport(
            class_name='_UNMATCHED_FILENAME',
            class_id=-1,
            image_count=unknown_images,
            possible_errors=[f'{unknown_images} image(s) with unrecognized filename prefix'],
            recommended_fixes=['Rename files to CLASS_KEY_description_index.ext pattern'],
        )

    return sorted(reports.values(), key=lambda r: (r.image_count, r.class_name))


def write_reports(
    *,
    dataset_root: Path,
    yaml_path: Path,
    records: list[ImageRecord],
    class_reports: list[ClassReport],
    global_issues: list[str],
    duplicate_groups: dict[str, list[Path]],
    blur_threshold: float,
) -> tuple[Path, Path, Path]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    md_path = REPORT_DIR / f'DATASET_QUALITY_AUDIT_{stamp}.md'
    csv_path = REPORT_DIR / f'dataset_quality_by_class_{stamp}.csv'
    detail_csv = REPORT_DIR / f'dataset_quality_images_{stamp}.csv'

    total_images = len(records)
    total_errors = sum(len(r.errors) for r in records)
    total_warnings = sum(len(r.warnings) for r in records)
    classes_with_images = sum(1 for r in class_reports if r.image_count > 0 and not r.class_name.startswith('_'))
    classes_empty = sum(1 for r in class_reports if r.image_count == 0 and not r.class_name.startswith('_'))
    exact_dupes = sum(1 for k in duplicate_groups if k.startswith('exact_md5_'))
    near_dupes = sum(1 for k in duplicate_groups if k.startswith('near_dup_'))

    imbalance_low = [r for r in class_reports if 0 < r.image_count < IMBALANCE_WARN and not r.class_name.startswith('_')]

    lines = [
        '# Dataset Quality Audit Report',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        f'Dataset: `{dataset_root}`',
        f'Classes (data.yaml): `{yaml_path}`',
        '',
        '## Summary',
        '',
        f'| Metric | Value |',
        f'|--------|-------|',
        f'| Total images | {total_images} |',
        f'| Classes with images | {classes_with_images} |',
        f'| Classes with zero images | {classes_empty} |',
        f'| Images with errors | {sum(1 for r in records if r.errors)} |',
        f'| Images with warnings | {sum(1 for r in records if r.warnings)} |',
        f'| Total error flags | {total_errors} |',
        f'| Total warning flags | {total_warnings} |',
        f'| Exact duplicate groups | {exact_dupes} |',
        f'| Near-duplicate pairs | {near_dupes} |',
        f'| Classes with &lt;{IMBALANCE_WARN} images | {len(imbalance_low)} |',
        f'| Blur threshold (Laplacian var) | {blur_threshold} |',
        '',
        '## Per-Class Summary',
        '',
        '| Class Name | Image Count | Label Count | Possible Errors | Recommended Fixes |',
        '|------------|-------------|-------------|-----------------|-------------------|',
    ]

    with csv_path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        writer.writerow([
            'Class Name', 'Class ID', 'Image Count', 'Label Count',
            'Train Images', 'Val Images', 'Possible Errors', 'Recommended Fixes',
        ])
        for row in class_reports:
            if row.class_name.startswith('_'):
                continue
            errs = '; '.join(row.possible_errors[:6]) if row.possible_errors else '—'
            fixes = '; '.join(dict.fromkeys(row.recommended_fixes)) if row.recommended_fixes else '—'
            lines.append(
                f'| {row.class_name} | {row.image_count} | {row.label_count} | '
                f'{errs[:120]}{"…" if len(errs) > 120 else ""} | {fixes[:120]}{"…" if len(fixes) > 120 else ""} |'
            )
            writer.writerow([
                row.class_name,
                row.class_id,
                row.image_count,
                row.label_count,
                row.train_images,
                row.val_images,
                errs,
                fixes,
            ])

    if global_issues:
        lines.extend(['', '## Global Issues', ''])
        for issue in global_issues[:50]:
            lines.append(f'- {issue}')
        if len(global_issues) > 50:
            lines.append(f'- … and {len(global_issues) - 50} more')

    if duplicate_groups:
        lines.extend(['', '## Duplicate Groups (sample)', ''])
        shown = 0
        for group_key, paths in list(duplicate_groups.items())[:25]:
            paths_str = ', '.join(p.name for p in paths[:4])
            lines.append(f'- **{group_key}**: {paths_str}')
            shown += 1
        if len(duplicate_groups) > shown:
            lines.append(f'- … {len(duplicate_groups) - shown} more groups in detail CSV')

    lines.extend([
        '',
        '## Notes',
        '',
        '- This report is **read-only** — no dataset files were modified.',
        '- Review label/filename mismatches manually before retraining.',
        '- Low sharpness warnings use Laplacian variance on full composite images.',
        '- Near-duplicates use perceptual hash (Hamming distance ≤ 6) within the same class.',
    ])

    md_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    with detail_csv.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        writer.writerow([
            'split', 'image', 'filename_class', 'label_classes', 'blur', 'brightness',
            'width', 'height', 'errors', 'warnings',
        ])
        for rec in records:
            writer.writerow([
                rec.split,
                rec.image_path.name,
                rec.filename_class or '',
                '|'.join(rec.class_names),
                f'{rec.blur_score:.1f}' if rec.blur_score is not None else '',
                f'{rec.brightness:.1f}' if rec.brightness is not None else '',
                rec.width,
                rec.height,
                '; '.join(rec.errors),
                '; '.join(rec.warnings),
            ])

    return md_path, csv_path, detail_csv


def run_audit(
    dataset_root: Path,
    yaml_path: Path,
    *,
    blur_threshold: float,
) -> int:
    names = load_yaml_names(yaml_path)
    if not dataset_root.is_dir():
        raise FileNotFoundError(f'Dataset not found: {dataset_root}')

    records, global_issues, duplicate_groups = scan_dataset(
        dataset_root, names, blur_threshold=blur_threshold,
    )
    class_reports = build_class_reports(records, names, duplicate_groups)
    md_path, csv_path, detail_csv = write_reports(
        dataset_root=dataset_root,
        yaml_path=yaml_path,
        records=records,
        class_reports=class_reports,
        global_issues=global_issues,
        duplicate_groups=duplicate_groups,
        blur_threshold=blur_threshold,
    )

    err_images = sum(1 for r in records if r.errors)
    warn_images = sum(1 for r in records if r.warnings)
    classes_used = sum(1 for r in class_reports if r.image_count > 0 and not r.class_name.startswith('_'))

    print(f'Dataset: {dataset_root}')
    print(f'Images scanned: {len(records)}')
    print(f'Classes in yaml: {len(names)}')
    print(f'Classes with images: {classes_used}')
    print(f'Images with errors: {err_images}')
    print(f'Images with warnings: {warn_images}')
    print(f'Duplicate groups: {len(duplicate_groups)}')
    print(f'Markdown: {md_path}')
    print(f'Class CSV: {csv_path}')
    print(f'Image CSV: {detail_csv}')
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description='Read-only YOLO dataset quality audit')
    parser.add_argument(
        '--dataset',
        type=Path,
        default=AI_ROOT / 'dataset',
        help='Dataset root (default: ai/dataset)',
    )
    parser.add_argument(
        '--data-yaml',
        type=Path,
        default=None,
        help='data.yaml path (default: ai/data.yaml or dataset/data.yaml)',
    )
    parser.add_argument(
        '--blur-threshold',
        type=float,
        default=BLUR_LOW_THRESHOLD,
        help='Laplacian variance below this flags blurry images',
    )
    args = parser.parse_args()

    dataset_root = args.dataset if args.dataset.is_absolute() else ROOT / args.dataset
    if args.data_yaml:
        yaml_path = args.data_yaml if args.data_yaml.is_absolute() else ROOT / args.data_yaml
    elif (dataset_root / 'data.yaml').is_file():
        yaml_path = dataset_root / 'data.yaml'
    else:
        yaml_path = AI_ROOT / 'data.yaml'

    sys.exit(run_audit(dataset_root, yaml_path, blur_threshold=args.blur_threshold))


if __name__ == '__main__':
    main()
