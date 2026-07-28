#!/usr/bin/env python
"""
Train YOLOv8 on Cambodia traffic sign dataset.

Prerequisites:
  python build_dataset.py
  pip install ultralytics

Usage:
  python train.py
  python train.py --epochs 30 --batch 4 --device cpu
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data.yaml'
DATASET_DIR = ROOT / 'dataset'
WEIGHTS_DIR = ROOT / 'weights'
WEIGHTS_DIR.mkdir(exist_ok=True)
BACKEND_DIR = ROOT.parent / 'backend'
sys.path.insert(0, str(ROOT / 'scripts'))
from dim_sareach_paths import road_signs_root  # noqa: E402

CAMBODIA_REFERENCE_ROOT = road_signs_root()
DEFAULT_SOURCE_DIRS = (CAMBODIA_REFERENCE_ROOT,)


def sync_system_after_train(model_path: Path) -> None:
    """Import trained signs to DB and enable live model in backend/.env."""
    manage = BACKEND_DIR / 'manage.py'
    if not manage.is_file():
        print('Warning: backend/manage.py not found - skip auto-sync.')
        return
    print('\nSyncing trained signs into CamTraffic (database + .env)...')
    cmd = [
        sys.executable,
        str(manage),
        'sync_ai_training',
        f'--model-path={model_path.resolve()}',
    ]
    for src in DEFAULT_SOURCE_DIRS:
        if src.is_dir():
            cmd.append(f'--source-dir={src}')
    try:
        subprocess.run(cmd, cwd=BACKEND_DIR, check=True)
    except subprocess.CalledProcessError as exc:
        print(
            f'Warning: auto-sync failed (exit {exc.returncode}). Run manually:\n'
            f'  python scripts/sync_sign_catalog.py'
        )
    else:
        print('System sync complete.')


def ensure_data_yaml_paths() -> Path:
    """Rewrite data.yaml with absolute dataset path (Ultralytics datasets-dir quirk)."""
    dataset_root = DATASET_DIR.resolve().as_posix()
    if DATA.exists():
        text = DATA.read_text(encoding='utf-8')
        lines = []
        for line in text.splitlines():
            if line.startswith('path:'):
                lines.append(f'path: {dataset_root}')
            else:
                lines.append(line)
        DATA.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return DATA


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=30)
    parser.add_argument('--batch', type=int, default=4)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--device', type=str, default='cpu')
    parser.add_argument('--model', type=str, default='yolov8n.pt')
    parser.add_argument(
        '--no-sync',
        action='store_true',
        help='Skip auto-import signs + update backend/.env after training',
    )
    args = parser.parse_args()

    if not DATA.exists():
        raise SystemExit('data.yaml missing. Run: python ai/build_dataset.py')

    train_dir = DATASET_DIR / 'images' / 'train'
    val_dir = DATASET_DIR / 'images' / 'val'
    train_images = list(train_dir.glob('*.jpg'))
    val_images = list(val_dir.glob('*.jpg'))
    if len(train_images) < 1:
        raise SystemExit('Dataset empty. Run: python ai/build_dataset.py')
    if len(val_images) < 1:
        raise SystemExit(f'Validation set empty ({val_dir}). Run build_dataset.py again.')

    data_yaml = ensure_data_yaml_paths()
    print(f'Training on {len(train_images)} train / {len(val_images)} val images, config={data_yaml}')
    model = YOLO(args.model)
    kwargs = dict(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(WEIGHTS_DIR),
        name='camtraffic_signs',
        patience=15,
        save=True,
        plots=True,
        device=args.device,
    )
    results = model.train(**kwargs)
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    if best.exists():
        dest = WEIGHTS_DIR / 'best.pt'
        shutil.copy(best, dest)
        print(f'\nModel saved to {dest}')
        if args.no_sync:
            print('Auto-sync skipped (--no-sync).')
        else:
            sync_system_after_train(dest)
    return results


if __name__ == '__main__':
    main()
