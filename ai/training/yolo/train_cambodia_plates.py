#!/usr/bin/env python
"""
Train YOLOv8 license-plate detector on Cambodia plates.
Then OCR (EasyOCR) reads text from detected crops — production pipeline.

Dataset: converted License Plate.v3 (single class license_plate)
Weights → ai/weights/best_cambodia_plates.pt
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

DEFAULT_DATA = (
    AI_ROOT / 'datasets' / 'splits' / 'cambodia_license_plates' / 'data.yaml'
)


def main() -> int:
    parser = argparse.ArgumentParser(description='Train Cambodia plate detector')
    parser.add_argument('--data', type=Path, default=DEFAULT_DATA)
    parser.add_argument('--epochs', type=int, default=120)
    parser.add_argument('--batch', type=int, default=4)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--model', default='yolov8n.pt')
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--name', default='cambodia_license_plates')
    parser.add_argument('--patience', type=int, default=40)
    args = parser.parse_args()

    data = abs_yaml(args.data.resolve())
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    print('=' * 70)
    print('CamTraffic — Cambodia License Plate Detection Training')
    print('=' * 70)
    print(f'Data: {data}')
    print(f'Epochs={args.epochs} batch={args.batch} device={args.device}')

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
        warmup_epochs=5,
        # Strong aug — small dataset (44 images)
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.5,
        degrees=8.0,
        translate=0.12,
        scale=0.6,
        shear=3.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.15,
        close_mosaic=15,
        plots=True,
        exist_ok=True,
    )

    save_dir = Path(results.save_dir)
    best = save_dir / 'weights' / 'best.pt'
    dest = WEIGHTS_DIR / 'best_cambodia_plates.pt'
    alias = WEIGHTS_DIR / 'best_plates.pt'
    if best.is_file():
        shutil.copy2(best, dest)
        shutil.copy2(best, alias)
        print(f'✅ Production weights: {dest}')

    status = {
        'dataset': 'cambodia_license_plates',
        'source': 'License Plate.v3-license-plate_v1.yolov8',
        'classes': ['license_plate'],
        'pipeline': 'YOLO detect → EasyOCR on crop',
        'epochs': args.epochs,
        'best_weights': str(dest) if best.is_file() else None,
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'production_ready': best.is_file(),
    }
    (WEIGHTS_DIR / 'cambodia_plates_training_status.json').write_text(
        json.dumps(status, indent=2), encoding='utf-8',
    )

    try:
        metrics = model.val(data=str(data), split='test')
        if metrics is not None:
            print(f'Test mAP50: {getattr(metrics.box, "map50", "n/a")}')
            print(f'Test mAP50-95: {getattr(metrics.box, "map", "n/a")}')
    except Exception as exc:
        print(f'Test val skipped: {exc}')

    # Also copy yaml for training/yolo convenience
    yaml_copy = TRAINING_YOLO / 'dataset_cambodia_plates.yaml'
    yaml_copy.write_text(
        Path(data).read_text(encoding='utf-8')
        if Path(str(data)).is_file()
        else args.data.read_text(encoding='utf-8'),
        encoding='utf-8',
    )
    return 0 if best.is_file() else 1


if __name__ == '__main__':
    raise SystemExit(main())
