#!/usr/bin/env python
"""
Train YOLOv8 on Cambodia Traffic Vehicles (Bus, Car, Moto, Truck, Tuk Tuk).

Real Phnom Penh footage from Roboflow export Cambodia Traffic.v1i.yolov8.
Production weights → ai/weights/best_cambodia_vehicles.pt
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml

DEFAULT_DATA = TRAINING_YOLO / 'dataset_cambodia_vehicles.yaml'


def main() -> int:
    parser = argparse.ArgumentParser(description='Train Cambodia vehicle detector')
    parser.add_argument('--data', type=Path, default=DEFAULT_DATA)
    parser.add_argument('--epochs', type=int, default=80)
    parser.add_argument('--batch', type=int, default=4)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--model', default='yolov8n.pt', help='Base checkpoint')
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--name', default='cambodia_traffic_vehicles')
    parser.add_argument('--patience', type=int, default=25)
    args = parser.parse_args()

    data = abs_yaml(args.data.resolve())
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    print('=' * 70)
    print('CamTraffic — Cambodia Traffic Vehicles Training')
    print('=' * 70)
    print(f'Data:    {data}')
    print(f'Model:   {args.model}')
    print(f'Epochs:  {args.epochs}  batch={args.batch}  device={args.device}')
    print()

    model = YOLO(args.model)
    results = model.train(
        data=str(data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(AI_ROOT / 'runs' / 'detect'),
        name=args.name,
        patience=args.patience,
        optimizer='AdamW',
        lr0=0.001,
        lrf=0.01,
        cos_lr=True,
        warmup_epochs=3,
        weight_decay=0.0005,
        # Cambodia road lighting / dense traffic
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.5,
        degrees=5.0,
        translate=0.1,
        scale=0.5,
        shear=2.0,
        fliplr=0.5,
        mosaic=1.0,
        copy_paste=0.1,
        close_mosaic=10,
        plots=True,
        exist_ok=True,
    )

    save_dir = Path(results.save_dir)
    best = save_dir / 'weights' / 'best.pt'
    last = save_dir / 'weights' / 'last.pt'
    dest_best = WEIGHTS_DIR / 'best_cambodia_vehicles.pt'
    dest_last = WEIGHTS_DIR / 'last_cambodia_vehicles.pt'
    if best.is_file():
        shutil.copy2(best, dest_best)
        print(f'✅ Production weights: {dest_best}')
    if last.is_file():
        shutil.copy2(last, dest_last)

    # Also set as default vehicle weights alias
    alias = WEIGHTS_DIR / 'best_vehicles.pt'
    if best.is_file():
        shutil.copy2(best, alias)
        print(f'✅ Alias: {alias}')

    status = {
        'dataset': 'cambodia_traffic_vehicles',
        'source': 'Cambodia Traffic.v1i.yolov8 (Roboflow)',
        'classes': ['Bus', 'Car', 'Moto', 'Truck', 'Tuk Tuk'],
        'epochs': args.epochs,
        'model_base': args.model,
        'device': args.device,
        'save_dir': str(save_dir),
        'best_weights': str(dest_best) if best.is_file() else None,
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'production_ready': best.is_file(),
    }
    status_path = WEIGHTS_DIR / 'cambodia_vehicles_training_status.json'
    status_path.write_text(json.dumps(status, indent=2), encoding='utf-8')
    print(f'Status: {status_path}')

    # Quick val metrics print
    try:
        metrics = model.val(data=str(data), split='test')
        if metrics is not None:
            print(f'Test mAP50: {getattr(metrics.box, "map50", "n/a")}')
            print(f'Test mAP50-95: {getattr(metrics.box, "map", "n/a")}')
    except Exception as exc:
        print(f'Val skipped: {exc}')

    return 0 if best.is_file() else 1


if __name__ == '__main__':
    raise SystemExit(main())
