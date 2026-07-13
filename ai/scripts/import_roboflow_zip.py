#!/usr/bin/env python
"""
Import Roboflow YOLO export into ai/datasets/raw/ (vehicles or license plates).

Expects standard Roboflow YOLOv8 layout:
  train/images/, train/labels/, valid/images/, ...

Usage (local reference folders — recommended):
  python ai/scripts/import_roboflow_zip.py --type vehicles --batch BATCH-ROBO-VEH-001
  python ai/scripts/import_roboflow_zip.py --type plates --batch BATCH-ROBO-PLATE-001

Or explicit paths:
  python ai/scripts/import_roboflow_zip.py --folder "D:/.../Cambodia Traffic.v1i.yolov11" --type vehicles --batch BATCH-ROBO-VEH-001
  python ai/scripts/import_roboflow_zip.py --folder "D:/.../Plate Number.v3i.yolov11" --type plates --batch BATCH-ROBO-PLATE-001
  python ai/scripts/import_roboflow_zip.py --zip export.zip --type vehicles --batch BATCH-ROBO-VEH-001
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import DATASETS_ROOT, IMAGE_EXTS, MANIFESTS_DIR, REPORTS_DIR, sha256_file

DEFAULT_ROBOFLOW = {
    'vehicles': Path(
        r'D:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
        r'\Dim Sareach\Cambodia Traffic.v1i.yolov11'
    ),
    'plates': Path(
        r'D:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
        r'\Dim Sareach\Plate Number.v3i.yolov11'
    ),
}

VEHICLE_CLASS_DIRS = {
    'sedan', 'suv', 'pickup', 'motorcycle', 'scooter', 'bus', 'truck', 'van', 'taxi',
}
PLATE_CLASS_DIRS = {'private', 'commercial', 'government'}


def extract_zip(zip_path: Path) -> Path:
    tmp = Path(tempfile.mkdtemp(prefix='camtraffic_roboflow_'))
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(tmp)
    return tmp


def find_image_roots(extracted: Path) -> list[Path]:
    roots: set[Path] = set()
    for images_dir in extracted.rglob('images'):
        if images_dir.is_dir() and any(images_dir.rglob('*')):
            roots.add(images_dir)
    if not roots:
        for path in extracted.rglob('*'):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
                roots.add(path.parent)
    return sorted(roots)


ROBOFLOW_VEHICLE_MAP = {
    'bus': 'bus',
    'car': 'sedan',
    'moto': 'motorcycle',
    'motorcycle': 'motorcycle',
    'truck': 'truck',
    'tuk tuk': 'scooter',
    'tuk-tuk': 'scooter',
    'van': 'van',
    'taxi': 'taxi',
    'suv': 'suv',
    'pickup': 'pickup',
}


def load_roboflow_names(root: Path) -> dict[int, str]:
    yaml_path = root / 'data.yaml'
    if not yaml_path.is_file():
        return {}
    names: dict[int, str] = {}
    in_names = False
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        if line.strip().startswith('names:'):
            in_names = True
            inline = line.split('names:', 1)[-1].strip()
            if inline.startswith('['):
                import ast
                for i, n in enumerate(ast.literal_eval(inline)):
                    names[i] = str(n)
                in_names = False
            continue
        if in_names:
            m = re.match(r"\s*-?\s*['\"]?(\d+)['\"]?\s*:\s*['\"]?(.+?)['\"]?\s*$", line)
            if m:
                names[int(m.group(1))] = m.group(2).strip()
    return names


def map_roboflow_vehicle(name: str) -> str:
    key = name.lower().strip()
    return ROBOFLOW_VEHICLE_MAP.get(key, 'sedan')


def infer_vehicle_class(stem: str, label_path: Path | None, roboflow_names: dict[int, str] | None = None) -> str:
    if label_path and label_path.is_file():
        cls_id = label_path.read_text(encoding='utf-8').strip().split()[0]
        try:
            idx = int(cls_id)
            if roboflow_names and idx in roboflow_names:
                return map_roboflow_vehicle(roboflow_names[idx])
            mapping = ['bus', 'sedan', 'motorcycle', 'truck', 'scooter']
            if 0 <= idx < len(mapping):
                return mapping[idx]
        except (ValueError, IndexError):
            pass
    lower = stem.lower()
    for cls in VEHICLE_CLASS_DIRS:
        if cls in lower:
            return cls
    return 'sedan'


def infer_plate_class(stem: str) -> str:
    u = stem.upper()
    if u.startswith(('BTM', 'KPS', 'KPT')):
        return 'commercial'
    if u.startswith(('GV', 'GOV', 'POL', 'MIL', 'ROYAL')):
        return 'government'
    return 'private'


def next_seq(root: Path, prefix: str) -> int:
    nums = []
    for path in root.glob(f'{prefix}_*.*'):
        m = re.search(r'_(\d+)\.', path.name)
        if m:
            nums.append(int(m.group(1)))
    return max(nums, default=0) + 1


def existing_hashes(bucket: Path) -> set[str]:
    seen: set[str] = set()
    if not bucket.is_dir():
        return seen
    for path in bucket.rglob('*'):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            seen.add(sha256_file(path))
    return seen


def import_images(
    source: Path,
    *,
    bucket_type: str,
    batch_id: str,
    dry_run: bool = False,
    from_zip: bool = False,
) -> dict:
    extracted = extract_zip(source) if from_zip else source.resolve()
    cleanup = from_zip
    try:
        roboflow_names = load_roboflow_names(extracted)
        if bucket_type == 'vehicles':
            dest_root = DATASETS_ROOT / 'raw' / 'vehicles'
            prefix_tpl = 'VEHICLE_{cls}'
        else:
            dest_root = DATASETS_ROOT / 'raw' / 'license_plates'
            prefix_tpl = 'PLATE_{cls}'

        seen = existing_hashes(dest_root)
        imported = 0
        skipped = 0
        by_class: dict[str, int] = {}

        for img_root in find_image_roots(extracted):
            labels_root = None
            parts = list(img_root.parts)
            if 'images' in parts:
                idx = parts.index('images')
                label_parts = parts[:]
                label_parts[idx] = 'labels'
                labels_root = Path(*label_parts)

            for src in sorted(img_root.rglob('*')):
                if not src.is_file() or src.suffix.lower() not in IMAGE_EXTS:
                    continue
                digest = sha256_file(src)
                if digest in seen:
                    skipped += 1
                    continue
                seen.add(digest)

                label_path = None
                if labels_root:
                    rel = src.relative_to(img_root)
                    candidate = labels_root / rel.with_suffix('.txt')
                    if candidate.is_file():
                        label_path = candidate

                if bucket_type == 'vehicles':
                    cls = infer_vehicle_class(src.stem, label_path, roboflow_names)
                    sub = dest_root / cls
                else:
                    cls = infer_plate_class(src.stem)
                    sub = dest_root / cls

                seq = next_seq(sub, prefix_tpl.format(cls=cls.upper()))
                ext = src.suffix.lower()
                if bucket_type == 'vehicles':
                    dest_name = f'VEHICLE_{cls.upper()}_{seq:06d}{ext}'
                else:
                    dest_name = f'PLATE_{cls.upper()}_{seq:06d}{ext}'
                dest = sub / dest_name

                if not dry_run:
                    sub.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dest)
                imported += 1
                by_class[cls] = by_class.get(cls, 0) + 1
    finally:
        if cleanup:
            shutil.rmtree(extracted, ignore_errors=True)

    manifest = {
        'batch_id': batch_id,
        'source': str(source.resolve()),
        'bucket_type': bucket_type,
        'imported_at': datetime.now(timezone.utc).isoformat(),
        'imported': imported,
        'skipped_duplicates': skipped,
        'by_class': by_class,
        'roboflow_classes': roboflow_names,
    }

    if not dry_run and imported:
        MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
        out = MANIFESTS_DIR / f'{batch_id}.json'
        out.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        log_path = DATASETS_ROOT / 'raw' / 'import_log.csv'
        write_header = not log_path.is_file() or log_path.stat().st_size == 0
        with log_path.open('a', newline='', encoding='utf-8') as fh:
            writer = csv.writer(fh)
            if write_header:
                writer.writerow(['batch_id', 'source', 'files', 'imported_at', 'notes'])
            writer.writerow([
                batch_id,
                str(source),
                imported,
                manifest['imported_at'],
                f'type={bucket_type}, skipped={skipped}',
            ])
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        (REPORTS_DIR / f'import_{batch_id}_{stamp}.json').write_text(
            json.dumps(manifest, indent=2), encoding='utf-8',
        )

    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description='Import Roboflow YOLO export into raw buckets')
    src = parser.add_mutually_exclusive_group(required=False)
    src.add_argument('--zip', type=Path, help='Roboflow YOLO ZIP file')
    src.add_argument('--folder', type=Path, help='Extracted Roboflow YOLO folder')
    parser.add_argument('--type', choices=('vehicles', 'plates'), required=True)
    parser.add_argument('--batch', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    from_zip = False
    if args.zip:
        zip_path = args.zip.resolve()
        if zip_path.is_file():
            source = zip_path
            from_zip = True
        else:
            fallback = DEFAULT_ROBOFLOW.get(args.type)
            if fallback and fallback.is_dir():
                print(f'Note: ZIP not found ({zip_path}); using default folder:\n  {fallback}')
                source = fallback.resolve()
            else:
                raise SystemExit(
                    f'ZIP not found: {zip_path}\n'
                    f'Run without --zip to use the default reference folder:\n'
                    f'  python ai/scripts/import_roboflow_zip.py --type {args.type} --batch {args.batch}'
                )
    else:
        source = (args.folder or DEFAULT_ROBOFLOW.get(args.type)).resolve()
        if not source.is_dir():
            raise SystemExit(
                f'Folder not found: {source}\n'
                f'Pass --folder with your Roboflow export path, or --zip for a ZIP file.'
            )

    manifest = import_images(
        source, bucket_type=args.type, batch_id=args.batch,
        dry_run=args.dry_run, from_zip=from_zip,
    )
    print(f"Batch: {manifest['batch_id']}")
    print(f"Imported: {manifest['imported']}")
    print(f"Skipped duplicates: {manifest['skipped_duplicates']}")
    print(f"By class: {manifest['by_class']}")
    if args.dry_run:
        print('Dry run — no files copied')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
