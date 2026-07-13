#!/usr/bin/env python
"""
Aggregate dataset collection statistics across CamTraffic AI assets.

Usage:
  python ai/scripts/collection_tracker.py
  python ai/scripts/collection_tracker.py --write-manifest
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DATASETS_ROOT, MANIFESTS_DIR, REPORTS_DIR, iter_images, load_yaml_names

# Checklist targets (Phase 7)
TARGETS = {
    'traffic_signs': 2980,
    'vehicles': 4615,
    'license_plates': 1253,
    'road_total': 8848,
}

VEHICLE_CLASSES = [
    'sedan', 'suv', 'pickup', 'motorcycle', 'scooter', 'bus', 'truck', 'van', 'taxi',
]
PLATE_CLASSES = ['private', 'commercial', 'government']
ROAD_BUCKETS = ['day', 'night', 'rain', 'highway', 'urban', 'rural']


def count_yolo_dataset(root: Path, yaml_path: Path | None = None) -> dict:
    if not root.is_dir():
        return {'path': str(root), 'images': 0, 'classes': 0, 'by_class': {}}
    yaml_path = yaml_path or (root / 'data.yaml')
    names = load_yaml_names(yaml_path) if yaml_path.is_file() else {}
    by_class: Counter[str] = Counter()
    images = iter_images(root)
    for _split, img in images:
        stem = img.stem
        cls = stem.rsplit('_', 1)[0] if '_' in stem else stem
        for name in names.values():
            if stem.startswith(name):
                cls = name
                break
        by_class[cls] += 1
    return {
        'path': str(root),
        'images': len(images),
        'classes': len(names) or len(by_class),
        'by_class': dict(by_class.most_common()),
    }


def count_raw_bucket(bucket: Path) -> int:
    if not bucket.is_dir():
        return 0
    exts = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.mp4', '.mov', '.mkv'}
    return sum(1 for p in bucket.rglob('*') if p.is_file() and p.suffix.lower() in exts)


def count_plates_raw() -> tuple[int, dict[str, int]]:
    root = DATASETS_ROOT / 'raw' / 'license_plates'
    if not root.is_dir():
        return 0, {}
    by_class: dict[str, int] = {}
    total = 0
    for cls_dir in root.iterdir():
        if not cls_dir.is_dir():
            continue
        n = count_raw_bucket(cls_dir)
        if n:
            by_class[cls_dir.name] = n
            total += n
    flat = count_raw_bucket(root)
    if flat and not by_class:
        return flat, {'unclassified': flat}
    return total, by_class


def count_vehicles_raw() -> int:
    root = DATASETS_ROOT / 'raw' / 'vehicles'
    return count_raw_bucket(root)


def build_report() -> dict:
    full = count_yolo_dataset(AI_ROOT / 'dataset', AI_ROOT / 'data.yaml')
    ten = count_yolo_dataset(AI_ROOT / 'dataset_10', AI_ROOT / 'dataset_10' / 'data.yaml')

    raw_root = DATASETS_ROOT / 'raw'
    road_counts = {b: count_raw_bucket(raw_root / 'road_footage' / b) for b in ROAD_BUCKETS}
    vehicle_count = count_vehicles_raw()
    plate_count, plate_by_class = count_plates_raw()

    sign_images = full['images'] or ten['images']
    road_total = sum(road_counts.values())

    return {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'traffic_signs': {
            'target': TARGETS['traffic_signs'],
            'collected': sign_images,
            'full_dataset': full,
            'production_10_class': ten,
        },
        'vehicles': {
            'target': TARGETS['vehicles'],
            'collected': vehicle_count,
            'classes': VEHICLE_CLASSES,
        },
        'license_plates': {
            'target': TARGETS['license_plates'],
            'collected': plate_count,
            'classes': PLATE_CLASSES,
            'by_class': plate_by_class,
        },
        'road_footage': {
            'target_total': TARGETS['road_total'],
            'collected_total': road_total,
            'buckets': road_counts,
        },
        'grand_total_images': sign_images + vehicle_count + plate_count + road_total,
        'grand_target': sum(TARGETS.values()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Dataset collection statistics')
    parser.add_argument('--write-manifest', action='store_true', help='Write ai/datasets/manifests/collection_stats.json')
    args = parser.parse_args()

    report = build_report()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'collection_stats_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    if args.write_manifest:
        MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
        manifest = MANIFESTS_DIR / 'collection_stats.json'
        manifest.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f'Manifest: {manifest}')

    ts = report['traffic_signs']
    print('CamTraffic dataset collection tracker')
    print(f"  Traffic signs: {ts['collected']}/{ts['target']} (full={ts['full_dataset']['images']}, dataset_10={ts['production_10_class']['images']})")
    print(f"  Vehicles:      {report['vehicles']['collected']}/{report['vehicles']['target']}")
    print(f"  Plates:        {report['license_plates']['collected']}/{report['license_plates']['target']}")
    print(f"  Road footage:  {report['road_footage']['collected_total']}/{report['road_footage']['target_total']}")
    print(f"  Grand total:   {report['grand_total_images']}/{report['grand_target']}")
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
