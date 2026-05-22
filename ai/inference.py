#!/usr/bin/env python
"""
Standalone YOLOv8 inference for traffic sign images.

Usage:
  python inference.py path/to/image.jpg
"""
import json
import sys
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / 'weights' / 'best.pt'

SIGN_INFO = {
    'stop': ('Stop Sign', 'Drivers must stop completely.', 'Stop before the line.'),
    'no_entry': ('No Entry', 'No entry allowed.', 'Find another route.'),
    'speed_limit_40': ('Speed Limit 40', 'Max 40 km/h.', 'Stay at or below 40 km/h.'),
}


def predict(image_path: str):
    if not MODEL_PATH.exists():
        print(json.dumps({
            'error': f'Model not found at {MODEL_PATH}. Run train.py first or set AI_USE_MOCK=True.',
        }))
        sys.exit(1)
    model = YOLO(str(MODEL_PATH))
    results = model(image_path, verbose=False)
    if not results[0].boxes:
        print(json.dumps({'sign_name': 'Unknown', 'confidence': 0}))
        return
    box = results[0].boxes[0]
    cls = int(box.cls[0])
    conf = float(box.conf[0]) * 100
    name = results[0].names.get(cls, 'unknown')
    info = SIGN_INFO.get(name, (name.replace('_', ' ').title(), '', ''))
    print(json.dumps({
        'sign_name': info[0],
        'confidence': round(conf, 1),
        'description': info[1],
        'guidance': info[2],
    }, indent=2))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python inference.py <image_path>')
        sys.exit(1)
    predict(sys.argv[1])
