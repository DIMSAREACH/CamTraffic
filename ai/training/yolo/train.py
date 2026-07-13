#!/usr/bin/env python
"""Bootstrap YOLO training (v1) — 5 epochs on dataset_10."""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml

DEFAULT_DATA = TRAINING_YOLO / 'dataset_signs_10.yaml'


def main() -> int:
    parser = argparse.ArgumentParser(description='CamTraffic YOLO v1 bootstrap training')
    parser.add_argument('--data', type=Path, default=DEFAULT_DATA)
    parser.add_argument('--epochs', type=int, default=5)
    parser.add_argument('--model', default='yolo11n.pt')
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--name', default='camtraffic-v1')
    args = parser.parse_args()

    data = abs_yaml(args.data.resolve())
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    model = YOLO(args.model)
    results = model.train(
        data=str(data),
        epochs=args.epochs,
        imgsz=640,
        batch=4,
        device=args.device,
        project=str(AI_ROOT / 'runs' / 'detect'),
        name=args.name,
        patience=10,
        plots=True,
    )
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    if best.is_file():
        dest = WEIGHTS_DIR / 'best.pt'
        shutil.copy2(best, dest)
        print(f'Production weights: {dest}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
