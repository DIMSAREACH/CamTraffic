"""Test detection on TEST-HIK cameras without hardware.

Usage: python scripts/test_hikvision_cameras.py  (from src/backend)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from infrastructure.models import Camera
from infrastructure.camera_models import get_camera_model_spec
from ai_detection.frame_capture import capture_frame_from_url
from ai_detection.pipeline import run_detection_pipeline


def main():
    cameras = Camera.objects.filter(code__startswith='TEST-HIK').order_by('code')
    print(f'Testing {cameras.count()} Hikvision test cameras...\n')

    for cam in cameras:
        spec = get_camera_model_spec(cam.model)
        print('=' * 60)
        print(f'[{cam.code}] {cam.name}')
        print(f'  Model: {cam.model} ({cam.brand})')
        if spec:
            print(f'  Radar: {spec.radar_frequency_ghz} GHz | Max targets: {spec.max_targets} | Lanes: {spec.lane_coverage}')

        url = cam.effective_frame_url()
        frame_path, fname = capture_frame_from_url(url)
        if not frame_path:
            print(f'  FRAME CAPTURE FAILED ({url})')
            continue
        print(f'  Frame captured: {fname}')

        result = run_detection_pipeline(
            frame_path,
            original_filename=fname or 'test.jpg',
            live_fast=True,
            enable_ocr=True,
            enable_plate=True,
        )
        vehicles = result.get('vehicles', [])
        plate = (result.get('plate_result') or {}).get('plate_text', '')
        print(f'  Vehicles detected: {len(vehicles)}')
        for v in vehicles[:5]:
            print(f'    - {v.get("vehicle_type")} (conf={v.get("confidence")})')
        print(f'  Plate: {plate or "none"}')

    print('\nDONE - Hikvision test complete')


if __name__ == '__main__':
    main()
