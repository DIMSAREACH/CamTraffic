#!/usr/bin/env python
"""FPS benchmark for YOLO weights."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import EVAL_ROOT, WEIGHTS_DIR, write_json
from post_train_eval import benchmark_fps
from ultralytics import YOLO


def main() -> int:
    parser = argparse.ArgumentParser(description='FPS benchmark')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best_v2.pt')
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--n', type=int, default=30)
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        weights = WEIGHTS_DIR / 'best.pt'
    model = YOLO(str(weights))
    fps = benchmark_fps(model, imgsz=args.imgsz, n=args.n)
    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'imgsz': args.imgsz,
        'iterations': args.n,
        'fps_cpu': fps,
    }
    out = EVAL_ROOT / 'fps_benchmark_cpu.json'
    write_json(out, report)
    print(f'FPS: {fps:.2f}')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
