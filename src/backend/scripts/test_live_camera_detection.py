#!/usr/bin/env python
"""Smoke-test live camera frame capture + street AI Detection pipeline."""
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

from django.conf import settings

from ai_detection.pipeline import run_detection_pipeline
from ai_detection.frame_capture import capture_camera_frame, resolve_local_frame_path
from ai_detection.sign_pipeline import draw_detection_overlays_on_image
from infrastructure.models import Camera


OUT = REPO / 'ai' / 'datasets' / 'samples' / 'live_camera_detect'
OUT.mkdir(parents=True, exist_ok=True)


def main() -> int:
    report: dict = {'cameras': [], 'ok': True}

    # Path resolve for demo frames (production-ready local fallback)
    for rel in (
        '/demo-cameras/monivong-intersection.jpg',
        '/demo-cameras/monivong-ptz.jpg',
        '/demo-cameras/nr6-highway.jpg',
    ):
        path = resolve_local_frame_path(rel)
        entry = {'url': rel, 'resolved': str(path) if path else None, 'exists': bool(path and path.is_file())}
        report.setdefault('path_checks', []).append(entry)
        if not entry['exists']:
            report['ok'] = False
            print(f'FAIL resolve {rel}')
        else:
            print(f'OK   resolve {rel} → {path}')

    cams = list(Camera.objects.filter(status='active').exclude(frame_source_url='').order_by('id')[:3])
    if not cams:
        # Try any with demo path
        cams = list(Camera.objects.exclude(frame_source_url='').order_by('id')[:3])
    if not cams:
        print('WARN: no cameras in DB — path checks only. Run: python manage.py seed_cameras --fix --sync-media')
        (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        return 1 if not report['ok'] else 0

    for cam in cams:
        print(f'\n=== Camera {cam.code} ({cam.id}) url={cam.frame_source_url!r} ===')
        tmp, fname = capture_camera_frame(cam.id)
        if not tmp:
            report['ok'] = False
            report['cameras'].append({'code': cam.code, 'capture': False})
            print('FAIL capture')
            continue

        out = run_detection_pipeline(
            tmp,
            original_filename=fname or 'webcam-street-camera.jpg',
            sign_only=False,
            unified_prep=False,
            enable_ocr=False,
            live_fast=False,
        )
        vehicles = out.get('vehicles') or []
        plate = out.get('plate_result') or {}
        sign = out.get('sign_result') or {}

        overlays = []
        for v in vehicles[:12]:
            if float(v.get('confidence') or 0) < 25:
                continue
            bb = v.get('bbox')
            if bb:
                overlays.append({
                    'kind': 'vehicle',
                    'bbox': bb,
                    'label': v.get('label') or 'Vehicle',
                    'confidence': float(v.get('confidence') or 0),
                    'color': (214, 182, 6),
                })
        for pb in (plate.get('plate_boxes') or [])[:4]:
            bb = pb.get('bbox') if isinstance(pb, dict) else None
            if bb:
                overlays.append({
                    'kind': 'plate',
                    'bbox': bb,
                    'label': 'Plate',
                    'confidence': float(pb.get('confidence') or 0),
                    'color': (15, 158, 245),
                })
        ann = draw_detection_overlays_on_image(tmp, overlays)
        dest = OUT / f'{cam.code or cam.id}_annotated.jpg'
        if ann:
            import shutil
            shutil.copy2(ann, dest)
            try:
                Path(ann).unlink(missing_ok=True)
            except OSError:
                pass
        try:
            Path(tmp).unlink(missing_ok=True)
        except OSError:
            pass

        row = {
            'code': cam.code,
            'capture': True,
            'filename': fname,
            'vehicles': len(vehicles),
            'vehicle_conf_max': max((float(v.get('confidence') or 0) for v in vehicles), default=0),
            'plate_boxes': len(plate.get('plate_boxes') or []),
            'sign_confidence': float(sign.get('confidence') or 0),
            'annotated': str(dest) if dest.exists() else None,
        }
        report['cameras'].append(row)
        print(
            f'OK   vehicles={row["vehicles"]} plates={row["plate_boxes"]} '
            f'sign_conf={row["sign_confidence"]:.1f} → {dest.name}'
        )
        if row['vehicles'] < 1 and row['plate_boxes'] < 1 and row['sign_confidence'] < 1:
            # Demo JPEGs may be empty streets — warn but don't fail hard if capture worked
            print('WARN weak detections on this frame (check weights / image content)')

    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\nWrote {OUT / "report.json"}')
    print(f'MEDIA_ROOT={settings.MEDIA_ROOT}')
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
