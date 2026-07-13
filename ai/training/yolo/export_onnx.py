#!/usr/bin/env python
"""Export YOLO weights to ONNX (opset 12)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import EXPORT_ROOT, WEIGHTS_DIR


def main() -> int:
    parser = argparse.ArgumentParser(description='Export YOLO to ONNX')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best_v2.pt')
    parser.add_argument('--opset', type=int, default=12)
    parser.add_argument('--name', default='yolov11_camtraffic_v1.onnx')
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        weights = WEIGHTS_DIR / 'best.pt'
    if not weights.is_file():
        raise SystemExit(f'Weights not found: {args.weights}')

    EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
    model = YOLO(str(weights))
    out = model.export(format='onnx', opset=args.opset, simplify=True)
    dest = EXPORT_ROOT / args.name
    Path(out).replace(dest)
    size_mb = dest.stat().st_size / (1024 * 1024)
    print(f'ONNX export: {dest} ({size_mb:.1f} MB, opset {args.opset})')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
