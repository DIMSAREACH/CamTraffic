#!/usr/bin/env python
"""YOLO v2 training with Cambodia-tuned hyperparameters."""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml, load_hyperparams

DEFAULT_DATA = TRAINING_YOLO / 'dataset_signs_10.yaml'


def main() -> int:
    parser = argparse.ArgumentParser(description='CamTraffic YOLO v2 training')
    parser.add_argument('--data', type=Path, default=DEFAULT_DATA)
    parser.add_argument('--resume', type=Path, default=None, help='Resume from checkpoint')
    parser.add_argument('--name', default='camtraffic-v2')
    parser.add_argument('--epochs', type=int, default=None, help='Override hyperparams epochs')
    args = parser.parse_args()

    hp = load_hyperparams()
    if args.epochs is not None:
        hp['epochs'] = args.epochs
    data = abs_yaml(args.data.resolve())
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    weights = args.resume or 'yolo11n.pt'
    model = YOLO(str(weights))
    train_kwargs = {
        'data': str(data),
        'epochs': hp.get('epochs', 50),
        'patience': hp.get('patience', 20),
        'imgsz': hp.get('imgsz', 640),
        'batch': hp.get('batch', 8),
        'device': hp.get('device', 'cpu'),
        'optimizer': hp.get('optimizer', 'AdamW'),
        'lr0': hp.get('lr0', 0.001),
        'lrf': hp.get('lrf', 0.01),
        'cos_lr': hp.get('cos_lr', True),
        'warmup_epochs': hp.get('warmup_epochs', 3),
        'weight_decay': hp.get('weight_decay', 0.0005),
        'hsv_h': hp.get('hsv_h', 0.015),
        'hsv_s': hp.get('hsv_s', 0.7),
        'hsv_v': hp.get('hsv_v', 0.5),
        'degrees': hp.get('degrees', 5.0),
        'translate': hp.get('translate', 0.1),
        'scale': hp.get('scale', 0.6),
        'shear': hp.get('shear', 2.0),
        'fliplr': hp.get('fliplr', 0.5),
        'mosaic': hp.get('mosaic', 1.0),
        'copy_paste': hp.get('copy_paste', 0.1),
        'close_mosaic': hp.get('close_mosaic', 10),
        'project': str(AI_ROOT / 'runs' / 'detect'),
        'name': args.name,
        'plots': True,
    }
    results = model.train(**train_kwargs)
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    if best.is_file():
        if args.name == 'camtraffic-v2':
            dest = WEIGHTS_DIR / 'best_v2.pt'
        elif 'combined' in args.name:
            dest = WEIGHTS_DIR / 'best_combined.pt'
        else:
            dest = WEIGHTS_DIR / f'best_{args.name}.pt'
        shutil.copy2(best, dest)
        print(f'Weights: {dest}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
