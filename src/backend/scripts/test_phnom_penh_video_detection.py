#!/usr/bin/env python
"""
Production check: Video upload AI detection on real Phnom Penh traffic .webm clips.

Samples frames, runs Cambodia vehicle + plate YOLO (+ optional signs), draws clear bboxes.
OCR is optional (slow); boxes are the production Video-upload deliverable.

Usage:
  cd src/backend
  python scripts/test_phnom_penh_video_detection.py
  python scripts/test_phnom_penh_video_detection.py --with-ocr
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent.parent
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django
django.setup()

from ai_detection.plate_detection import detect_plate_boxes_near_vehicles
from ai_detection.sign_pipeline import draw_detection_overlays_on_image
from ai_detection.vehicle_detection import detect_vehicles
from ai_detection.video_utils import build_annotated_preview_video, extract_video_frames

REF = Path(r'd:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset')
VIDEOS = [
    REF / 'stock-footage-phnom-penh-cambodia-th-january-busy-traffic-on-chaktomuk-walk-street-in-phnom-penh.webm',
    REF / 'stock-footage-phnom-penh-cambodia-vehicles-and-motorbikes-move-along-the-riverside-road-near-a.webm',
]
OUT = REPO / 'ai' / 'datasets' / 'samples' / 'phnom_penh_video_detect'
MAX_FRAMES = 12


def run_one(video: Path, *, with_ocr: bool) -> dict:
    print('=' * 70)
    print(f'VIDEO: {video.name}')
    print('=' * 70)
    if not video.is_file():
        return {'ok': False, 'error': 'missing', 'video': str(video)}

    out_dir = OUT / video.stem[:48]
    out_dir.mkdir(parents=True, exist_ok=True)

    sampled = extract_video_frames(str(video), max_frames=MAX_FRAMES)
    print(f'Frames sampled: {len(sampled)}')
    if not sampled:
        return {'ok': False, 'error': 'no_frames', 'video': video.name}

    summaries = []
    total_vehicles = 0
    total_plates = 0
    frames_with_boxes = 0
    annotated_paths: list[str] = []

    for i, (frame_path, ts) in enumerate(sampled):
        vehicles = detect_vehicles(frame_path)
        plates = detect_plate_boxes_near_vehicles(frame_path, vehicles)

        overlays: list[dict] = []
        for v in vehicles[:12]:
            bb = v.get('bbox')
            if bb:
                overlays.append({
                    'kind': 'vehicle',
                    'bbox': bb,
                    'label': v.get('label') or 'Vehicle',
                    'confidence': float(v.get('confidence') or 0),
                    'color': (214, 182, 6),
                })
        for pb in plates[:4]:
            bb = pb.get('bbox')
            if bb:
                overlays.append({
                    'kind': 'plate',
                    'bbox': bb,
                    'label': 'Plate',
                    'confidence': float(pb.get('confidence') or 0),
                    'color': (15, 158, 245),
                })

        plate_text = ''
        if with_ocr and (vehicles or plates):
            from ai_detection.plate_ocr import recognize_plate
            ocr = recognize_plate(frame_path, vehicles)
            plate_text = ocr.get('plate_text') or ''
            if plate_text and overlays:
                for o in overlays:
                    if o.get('kind') == 'plate':
                        o['label'] = plate_text

        total_vehicles += len(vehicles)
        total_plates += len(plates)
        if overlays:
            frames_with_boxes += 1

        ann = draw_detection_overlays_on_image(frame_path, overlays)
        if ann:
            dest = out_dir / f'frame_{i:02d}_t{ts:.1f}s_annotated.jpg'
            shutil.move(ann, dest)
            ann_path = str(dest)
            annotated_paths.append(ann_path)
        else:
            dest = out_dir / f'frame_{i:02d}_t{ts:.1f}s.jpg'
            shutil.copy2(frame_path, dest)
            ann_path = str(dest)

        summaries.append({
            'timestamp_sec': round(ts, 2),
            'vehicles': len(vehicles),
            'vehicle_labels': [v.get('label') for v in vehicles[:8]],
            'plate_boxes': len(plates),
            'plate_text': plate_text,
            'overlay_count': len(overlays),
            'annotated': ann_path,
        })
        print(
            f'  [{i + 1}/{len(sampled)}] t={ts:.1f}s  '
            f'vehicles={len(vehicles)} plates={len(plates)} overlays={len(overlays)}  '
            f'{vehicles[0].get("label") if vehicles else "-"}'
            + (f'  OCR={plate_text}' if plate_text else '')
        )
        Path(frame_path).unlink(missing_ok=True)

    preview = out_dir / 'annotated_preview.mp4'
    preview_ok = False
    if annotated_paths:
        preview_ok = build_annotated_preview_video(annotated_paths, str(preview), fps=2.0)

    report = {
        'ok': True,
        'video': video.name,
        'frames_sampled': len(sampled),
        'frames_with_boxes': frames_with_boxes,
        'total_vehicle_detections': total_vehicles,
        'total_plate_boxes': total_plates,
        'box_coverage_pct': round(100 * frames_with_boxes / max(len(sampled), 1), 1),
        'annotated_preview': str(preview) if preview_ok else '',
        'summaries': summaries,
        'output_dir': str(out_dir),
    }
    (out_dir / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'Coverage: {report["box_coverage_pct"]}% frames with clear boxes')
    print(f'Saved: {out_dir}')
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--with-ocr', action='store_true', help='Also run EasyOCR (slower)')
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    reports = [run_one(v, with_ocr=args.with_ocr) for v in VIDEOS]
    summary = {
        'videos': len(reports),
        'all_ok': all(r.get('ok') for r in reports),
        'with_ocr': args.with_ocr,
        'reports': [
            {k: v for k, v in r.items() if k != 'summaries'} | {'frame_count': len(r.get('summaries') or [])}
            for r in reports
        ],
    }
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print('\n' + '=' * 70)
    print('SUMMARY — Phnom Penh Video AI Detection')
    for r in reports:
        if not r.get('ok'):
            print(f"  FAIL {r.get('video')}: {r.get('error')}")
        else:
            print(
                f"  OK  frames={r['frames_sampled']}  "
                f"box_coverage={r['box_coverage_pct']}%  "
                f"vehicles={r['total_vehicle_detections']}  "
                f"plates={r['total_plate_boxes']}  "
                f"| {r['video'][:55]}"
            )
    print(f'Wrote {OUT / "summary.json"}')
    return 0 if summary['all_ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
