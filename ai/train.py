#!/usr/bin/env python
"""
Train YOLOv8 on Cambodia traffic sign dataset.

Prerequisites:
  python build_dataset.py
  pip install ultralytics

Usage:
  python train.py
  python train.py --epochs 40 --device 0
"""
import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data.yaml'
WEIGHTS_DIR = ROOT / 'weights'
WEIGHTS_DIR.mkdir(exist_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=40)
    parser.add_argument('--batch', type=int, default=16)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--device', type=str, default='', help='cuda device or cpu')
    parser.add_argument('--model', type=str, default='yolov8n.pt')
    args = parser.parse_args()

    if not DATA.exists():
        raise SystemExit('data.yaml missing. Run: python build_dataset.py')

    train_images = list((ROOT / 'dataset' / 'images' / 'train').glob('*.jpg'))
    if len(train_images) < 10:
        raise SystemExit('Dataset empty. Run: python build_dataset.py')

    print(f'Training on {len(train_images)}+ images, config={DATA}')
    model = YOLO(args.model)
    kwargs = dict(
        data=str(DATA),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(WEIGHTS_DIR),
        name='camtraffic_signs',
        patience=15,
        save=True,
        plots=True,
    )
    if args.device:
        kwargs['device'] = args.device

    results = model.train(**kwargs)
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    if best.exists():
        dest = WEIGHTS_DIR / 'best.pt'
        shutil.copy(best, dest)
        print(f'\nModel saved to {dest}')
        print('Set in backend/.env:')
        print('  AI_USE_MOCK=False')
        print(f'  AI_MODEL_PATH={dest.resolve()}')
    return results


if __name__ == '__main__':
    main()
