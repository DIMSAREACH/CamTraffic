#!/usr/bin/env python
"""
Verify Webcam Street mode pipeline (full_frame + vehicles + plate boxes, OCR off).

Uses a Phnom Penh annotated still as a fake webcam-street frame.

Usage:
  cd src/backend
  python scripts/test_webcam_street_detection.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent.parent
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django
django.setup()

from ai_detection.pipeline import run_detection_pipeline
from ai_detection.sign_pipeline import draw_detection_overlays_on_image

SAMPLE_DIRS = list((REPO / 'ai' / 'datasets' / 'samples' / 'phnom_penh_video_detect').glob('*'))
OUT = REPO / 'ai' / 'datasets' / 'samples' / 'webcam_street_verify'


def main() -> int:
    frames: list[Path] = []
    for d in SAMPLE_DIRS:
        frames.extend(sorted(d.glob('*_annotated.jpg'))[:3])
        frames.extend(sorted(d.glob('frame_*.jpg'))[:2])
    # Prefer raw video frames if we only have annotated — still OK for vehicle YOLO
    if not frames:
        print('No Phnom Penh sample frames — run test_phnom_penh_video_detection.py first')
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    # Use a non-annotated frame if possible (annotated has drawn boxes)
    candidates = [f for f in frames if 'annotated' not in f.name] or frames
    src = candidates[0]
    print(f'Testing webcam-street pipeline on: {src.name}')

    pipe = run_detection_pipeline(
        str(src),
        original_filename='webcam-street-test.jpg',
        sign_only=False,
        track_session='webcam-street-verify',
        unified_prep=False,
        enable_ocr=False,
    )
    vehicles = pipe.get('vehicles') or []
    plate = pipe.get('plate_result') or {}
    payload = pipe.get('payload') or {}

    overlays = []
    for v in vehicles[:12]:
        if float(v.get('confidence') or 0) < 25:
            continue
        if v.get('bbox'):
            overlays.append({
                'kind': 'vehicle',
                'bbox': v['bbox'],
                'label': v.get('label') or 'Vehicle',
                'confidence': float(v.get('confidence') or 0),
                'color': (214, 182, 6),
            })
    for pb in (plate.get('plate_boxes') or [])[:4]:
        if pb.get('bbox'):
            overlays.append({
                'kind': 'plate',
                'bbox': pb['bbox'],
                'label': plate.get('plate_text') or 'Plate',
                'confidence': float(pb.get('confidence') or 0),
                'color': (15, 158, 245),
            })

    ann = draw_detection_overlays_on_image(str(src), overlays)
    out_ann = OUT / 'webcam_street_annotated.jpg'
    if ann:
        import shutil
        shutil.move(ann, out_ann)

    report = {
        'ok': len(vehicles) > 0,
        'source': str(src),
        'vehicles': len(vehicles),
        'vehicle_labels': [v.get('label') for v in vehicles[:8]],
        'plate_boxes': len(plate.get('plate_boxes') or []),
        'plate_bbox': plate.get('plate_bbox'),
        'detection_mode': payload.get('detection_mode'),
        'annotated': str(out_ann) if out_ann.is_file() else '',
    }
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    print('OK' if report['ok'] else 'FAIL — no vehicles')
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
