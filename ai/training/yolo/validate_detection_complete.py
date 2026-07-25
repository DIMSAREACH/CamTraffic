#!/usr/bin/env python
"""
Validate Cambodia plate dataset GT + fast complete detection smoke test.

Usage (from repo):
  cd src/backend
  python ../../ai/training/yolo/validate_detection_complete.py

Checks:
  1) Plate dataset OCR GT has province for every labeled image
  2) Fast pipeline (~live_fast + OCR) returns plate + province + vehicle on Prius sample
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
SPLIT = AI_ROOT / 'datasets' / 'splits' / 'cambodia_license_plates'
BACKEND = AI_ROOT.parent / 'src' / 'backend'
SAMPLE = SPLIT / 'train' / 'images' / '1_jpeg.rf.26d6ae510e0e057507b979623ca22378.jpg'


def validate_dataset() -> list[str]:
    errors: list[str] = []
    gt_path = SPLIT / 'ocr_ground_truth.json'
    meta_path = SPLIT / 'class_to_plate_meta.json'
    if not gt_path.is_file():
        return [f'Missing {gt_path}']
    if not meta_path.is_file():
        return [f'Missing {meta_path}']

    gt = json.loads(gt_path.read_text(encoding='utf-8'))
    meta = json.loads(meta_path.read_text(encoding='utf-8'))

    if len(meta) != 42:
        errors.append(f'Expected 42 plate classes, got {len(meta)}')

    missing_prov = [
        k for k, v in meta.items()
        if not (v.get('province_en') or v.get('province_key') == 'CAMBODIA')
    ]
    if missing_prov:
        errors.append(f'Classes missing province: {missing_prov[:8]}')

    # Smoking gun: 2U-3108 must be Phnom Penh, not Battambang
    pp = next((v for v in meta.values() if v.get('plate_text') == '2U-3108'), None)
    if not pp:
        errors.append('Missing class for plate 2U-3108')
    elif pp.get('province_en') != 'Phnom Penh' or pp.get('province_code') != '12':
        errors.append(f'2U-3108 province wrong: {pp.get("province_en")} / {pp.get("province_code")}')

    empty_gt = [
        rel for rel, row in gt.items()
        if row.get('primary_plate') and not row.get('province_en')
        and row.get('province_key') != 'CAMBODIA'
        and row.get('plate_type') != 'special'
    ]
    if empty_gt:
        errors.append(f'OCR GT images missing province_en: {len(empty_gt)} (e.g. {empty_gt[0]})')

    # Ensure image files exist for GT keys
    missing_files = [rel for rel in gt if not (SPLIT / rel).is_file()]
    if missing_files:
        errors.append(f'Missing image files for GT: {len(missing_files)}')

    print(f'Dataset OK: {len(meta)} classes, {len(gt)} images with province-aware OCR GT')
    return errors


def smoke_fast_detection() -> list[str]:
    errors: list[str] = []
    if not SAMPLE.is_file():
        return [f'Missing sample image {SAMPLE}']

    sys.path.insert(0, str(BACKEND))
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    django.setup()

    from ai_detection.pipeline import run_detection_pipeline

    # Warm
    run_detection_pipeline(
        str(SAMPLE),
        original_filename='prius.jpg',
        live_fast=True,
        enable_ocr=True,
        enable_plate=True,
    )
    t0 = time.perf_counter()
    out = run_detection_pipeline(
        str(SAMPLE),
        original_filename='prius.jpg',
        live_fast=True,
        enable_ocr=True,
        enable_plate=True,
    )
    elapsed = time.perf_counter() - t0
    payload = out.get('payload') or {}
    plate = (payload.get('detected_plate') or '').strip()
    province = (payload.get('plate_province_en') or '').strip()
    vehicles = out.get('vehicles') or payload.get('vehicles') or []
    boxes = payload.get('plate_boxes') or []
    bbox = payload.get('plate_bbox')

    print(f'Fast detect: {elapsed:.2f}s | plate={plate} | province={province} | vehicles={len(vehicles)}')

    if elapsed > 5.0:
        errors.append(f'Fast detect too slow after warmup: {elapsed:.2f}s (want <= 5s)')
    if plate != '2U-3108':
        errors.append(f'Expected plate 2U-3108, got {plate!r}')
    if province != 'Phnom Penh':
        errors.append(f'Expected province Phnom Penh, got {province!r}')
    if not vehicles:
        errors.append('Expected at least 1 vehicle box')
    if not boxes and not bbox:
        errors.append('Expected plate bbox/boxes')
    return errors


def main() -> int:
    # Refresh GT from Roboflow source class names when available
    prep = AI_ROOT / 'training' / 'yolo' / 'prepare_cambodia_plates.py'
    if prep.is_file():
        import runpy
        sys.argv = [str(prep), '--gt-only']
        try:
            runpy.run_path(str(prep), run_name='__main__')
        except SystemExit as exc:
            if exc.code not in (0, None):
                print(f'GT refresh failed with code {exc.code}')
                return 1

    errors = validate_dataset()
    errors.extend(smoke_fast_detection())
    if errors:
        print('FAILED:')
        for e in errors:
            print(f'  - {e}')
        return 1
    print('COMPLETE: dataset + fast detection ready (plate, province, vehicle, speed).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
