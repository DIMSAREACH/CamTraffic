#!/usr/bin/env python
"""TensorRT / ONNX-FP16 export with graceful CPU fallback."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import EXPORT_ROOT, WEIGHTS_DIR


def main() -> int:
    parser = argparse.ArgumentParser(description='Export TensorRT or ONNX-FP16')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best_v2.pt')
    parser.add_argument('--format', choices=('engine', 'onnx'), default='onnx')
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        weights = WEIGHTS_DIR / 'best.pt'
    EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
    model = YOLO(str(weights))

    try:
        if args.format == 'engine':
            out = model.export(format='engine', half=True)
        else:
            out = model.export(format='onnx', half=True, simplify=True)
    except Exception as exc:
        print(f'GPU export failed ({exc}); falling back to ONNX FP32')
        out = model.export(format='onnx', opset=12, simplify=True)
        dest = EXPORT_ROOT / 'yolov11_camtraffic_fallback.onnx'
        Path(out).replace(dest)
        print(f'Fallback: {dest}')
        return 0

    dest = EXPORT_ROOT / Path(out).name
    Path(out).replace(dest)
    print(f'Export: {dest}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
