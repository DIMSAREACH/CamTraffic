#!/usr/bin/env python
"""
Annotation progress statistics across exports, splits, and OCR manifests.

Usage:
  python ai/scripts/annotation_tracker.py --write-manifest
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DATASETS_ROOT, MANIFESTS_DIR, REPORTS_DIR, iter_images, label_path_for
from validate_dataset import parse_label

EXPORTS_ROOT = DATASETS_ROOT / 'annotations' / 'exports'
SPLITS_ROOT = DATASETS_ROOT / 'splits'
BATCH_LOG = DATASETS_ROOT / 'annotations' / 'annotation_batch_log.csv'


def count_labeled(root: Path) -> tuple[int, Counter[int]]:
    by_class: Counter[int] = Counter()
    total = 0
    if not root.is_dir():
        return 0, by_class
    for _split, img in iter_images(root):
        label = label_path_for(img)
        if label is None:
            continue
        total += 1
        for cls, *_ in parse_label(label):
            by_class[cls] += 1
    return total, by_class


def load_batch_log() -> list[dict]:
    if not BATCH_LOG.is_file():
        return []
    with BATCH_LOG.open(encoding='utf-8') as fh:
        return list(csv.DictReader(fh))


def build_report() -> dict:
    class_map_path = DATASETS_ROOT / 'labels' / 'yolo' / 'class-map.json'
    class_map = json.loads(class_map_path.read_text(encoding='utf-8')) if class_map_path.is_file() else {}

    exports: dict[str, dict] = {}
    for export_dir in sorted(EXPORTS_ROOT.glob('*')) if EXPORTS_ROOT.is_dir() else []:
        if not export_dir.is_dir():
            continue
        n, by_cls = count_labeled(export_dir)
        exports[export_dir.name] = {'images': n, 'by_class': dict(by_cls)}

    splits: dict[str, dict] = {}
    for split_dir in sorted(SPLITS_ROOT.glob('*')) if SPLITS_ROOT.is_dir() else []:
        if not split_dir.is_dir():
            continue
        n, by_cls = count_labeled(split_dir)
        splits[split_dir.name] = {'images': n, 'by_class': dict(by_cls)}

    sign_full, _ = count_labeled(AI_ROOT / 'dataset')
    sign_10, _ = count_labeled(AI_ROOT / 'dataset_10')

    ocr_manifest = DATASETS_ROOT / 'annotations' / 'ocr' / 'ocr_manifest.csv'
    ocr_rows = 0
    if ocr_manifest.is_file():
        with ocr_manifest.open(encoding='utf-8') as fh:
            ocr_rows = sum(1 for _ in csv.DictReader(fh))

    vehicle_raw = sum(
        1 for p in (DATASETS_ROOT / 'raw' / 'vehicles').rglob('*')
        if p.is_file() and p.suffix.lower() in {'.jpg', '.jpeg', '.png'}
    ) if (DATASETS_ROOT / 'raw' / 'vehicles').is_dir() else 0

    return {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'combined_model_classes': class_map.get('nc', 0),
        'traffic_signs_labeled': {
            'full_236_class': sign_full,
            'production_10_class': sign_10,
        },
        'exports': exports,
        'splits': splits,
        'ocr_transcriptions': ocr_rows,
        'vehicles_pending_cvat': max(0, vehicle_raw - exports.get('BATCH-VEHICLES-PENDING', {}).get('images', 0)),
        'batch_log_entries': len(load_batch_log()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Annotation progress tracker')
    parser.add_argument('--write-manifest', action='store_true')
    args = parser.parse_args()

    report = build_report()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'annotation_stats_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    if args.write_manifest:
        MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
        manifest = MANIFESTS_DIR / 'annotation_stats.json'
        manifest.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f'Manifest: {manifest}')

    print('CamTraffic annotation tracker')
    print(f"  Signs labeled: full={report['traffic_signs_labeled']['full_236_class']}, dataset_10={report['traffic_signs_labeled']['production_10_class']}")
    print(f"  Exports: {len(report['exports'])} batches")
    for name, info in report['exports'].items():
        print(f"    {name}: {info['images']} images")
    print(f"  Splits: {len(report['splits'])}")
    print(f"  OCR transcriptions: {report['ocr_transcriptions']}")
    print(f"  Vehicles pending CVAT: {report['vehicles_pending_cvat']}")
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
