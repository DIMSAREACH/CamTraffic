"""Import Cambodian prohibitory reference sign graphics into CamTraffic dataset layout.

Source: reference catalog PNGs (PDF extract), not roadside photos.
Generates raw copies, processed renames, and a YOLO export batch with auto boxes.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = Path(
    r'd:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
    r'\Dim Sareach\Road signs in Cambodia\1-Prohibitory signs'
)
DEFAULT_CLASS_MAP = SERVICE_ROOT / 'data/datasets/manifests/prohibitory_sign_class_map.csv'
DEFAULT_BATCH_ID = 'BATCH-REF-PROH-001'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Import prohibitory reference signs')
    parser.add_argument('--source-dir', default=str(DEFAULT_SOURCE))
    parser.add_argument('--class-map', default=str(DEFAULT_CLASS_MAP))
    parser.add_argument('--batch-id', default=DEFAULT_BATCH_ID)
    parser.add_argument('--dry-run', action='store_true')
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def load_class_map(path: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    with path.open(encoding='utf-8', newline='') as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            mapping[row['source_filename']] = row['yolo_class']
    return mapping


def load_yolo_class_ids(classes_file: Path) -> dict[str, int]:
    lines = [line.strip() for line in classes_file.read_text(encoding='utf-8').splitlines() if line.strip()]
    return {name: index for index, name in enumerate(lines)}


def auto_bbox_normalized(image_path: Path) -> tuple[float, float, float, float]:
    image = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f'Unreadable image: {image_path}')

    if image.ndim == 3 and image.shape[2] == 4:
        alpha = image[:, :, 3]
        mask = (alpha > 10).astype(np.uint8) * 255
    else:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)

    coords = cv2.findNonZero(mask)
    if coords is None:
        return 0.5, 0.5, 0.9, 0.9

    x, y, w, h = cv2.boundingRect(coords)
    height, width = image.shape[:2]
    cx = (x + w / 2) / width
    cy = (y + h / 2) / height
    nw = w / width
    nh = h / height
    return cx, cy, nw, nh


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def main() -> None:
    args = parse_args()
    source_dir = resolve(args.source_dir)
    class_map_path = resolve(args.class_map)
    batch_id = args.batch_id

    if not source_dir.is_dir():
        raise FileNotFoundError(f'Source directory not found: {source_dir}')

    class_map = load_class_map(class_map_path)
    class_ids = load_yolo_class_ids(SERVICE_ROOT / 'data/datasets/labels/yolo/classes.txt')

    raw_dir = SERVICE_ROOT / 'data/datasets/raw/traffic-signs/reference/prohibitory-cambodia'
    processed_dir = SERVICE_ROOT / 'data/datasets/processed/traffic-signs/prohibitory-reference'
    export_images = SERVICE_ROOT / f'data/datasets/annotations/exports/{batch_id}/images'
    export_labels = SERVICE_ROOT / f'data/datasets/annotations/exports/{batch_id}/labels'
    manifest_path = SERVICE_ROOT / 'data/datasets/manifests/prohibitory_reference_manifest.csv'
    summary_path = SERVICE_ROOT / 'data/datasets/manifests/prohibitory_reference_summary.json'

    for directory in (raw_dir, processed_dir, export_images, export_labels):
        if not args.dry_run:
            directory.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, str]] = []
    class_counts: dict[str, int] = {}
    imported = 0
    skipped = 0

    for index, source in enumerate(sorted(source_dir.glob('*.png')), start=1):
        yolo_class = class_map.get(source.name)
        if yolo_class is None:
            print(f'SKIP (no mapping): {source.name}')
            skipped += 1
            continue

        if yolo_class not in class_ids:
            raise KeyError(f'Unknown YOLO class "{yolo_class}" for {source.name}')

        stem = f'proh_{yolo_class}_{index:03d}'
        target_name = f'{stem}.png'
        raw_target = raw_dir / source.name
        processed_target = processed_dir / target_name
        export_image = export_images / target_name
        export_label = export_labels / f'{stem}.txt'

        cx, cy, nw, nh = auto_bbox_normalized(source)
        class_id = class_ids[yolo_class]
        label_line = f'{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}'

        if not args.dry_run:
            shutil.copy2(source, raw_target)
            shutil.copy2(source, processed_target)
            shutil.copy2(source, export_image)
            export_label.write_text(label_line + '\n', encoding='utf-8')

        class_counts[yolo_class] = class_counts.get(yolo_class, 0) + 1
        imported += 1
        rows.append(
            {
                'sample_id': f'PROH-{index:03d}',
                'source_filename': source.name,
                'file_path': f'processed/traffic-signs/prohibitory-reference/{target_name}',
                'export_image': f'annotations/exports/{batch_id}/images/{target_name}',
                'export_label': f'annotations/exports/{batch_id}/labels/{stem}.txt',
                'yolo_class': yolo_class,
                'class_id': str(class_id),
                'bbox_cx': f'{cx:.6f}',
                'bbox_cy': f'{cy:.6f}',
                'bbox_w': f'{nw:.6f}',
                'bbox_h': f'{nh:.6f}',
                'content_hash': file_hash(source),
                'source_type': 'reference_catalog_pdf',
                'province': 'Cambodia',
                'notes': 'Prohibitory sign reference graphic (not roadside capture)',
            }
        )

    if not args.dry_run:
        with manifest_path.open('w', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [])
            if rows:
                writer.writeheader()
                writer.writerows(rows)

        summary = {
            'batch_id': batch_id,
            'imported_at': datetime.now(timezone.utc).isoformat(),
            'source_dir': str(source_dir),
            'imported': imported,
            'skipped': skipped,
            'class_counts': class_counts,
            'raw_dir': raw_dir.relative_to(SERVICE_ROOT).as_posix(),
            'processed_dir': processed_dir.relative_to(SERVICE_ROOT).as_posix(),
            'export_dir': f'annotations/exports/{batch_id}',
            'note': 'Reference catalog images for class bootstrap; supplement with roadside photos for production training.',
        }
        summary_path.write_text(json.dumps(summary, indent=2), encoding='utf-8')

    print(f'Imported: {imported}  Skipped: {skipped}')
    print('Class counts:', class_counts)
    if args.dry_run:
        print('Dry run only — no files written.')
    else:
        print(f'Manifest: {manifest_path}')
        print(f'Summary: {summary_path}')
        print(f'YOLO export: annotations/exports/{batch_id}')


if __name__ == '__main__':
    main()
