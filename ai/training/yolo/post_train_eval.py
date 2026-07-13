#!/usr/bin/env python
"""Post-training evaluation — mAP, per-class metrics, FPS."""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import yaml
from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, EVAL_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml, write_json


def benchmark_fps(model: YOLO, imgsz: int = 640, n: int = 20) -> float:
    import numpy as np
    dummy = np.zeros((imgsz, imgsz, 3), dtype=np.uint8)
    # warmup
    model.predict(dummy, verbose=False)
    start = time.perf_counter()
    for _ in range(n):
        model.predict(dummy, verbose=False)
    elapsed = time.perf_counter() - start
    return n / elapsed if elapsed > 0 else 0.0


def main() -> int:
    parser = argparse.ArgumentParser(description='Post-training evaluator')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best_v2.pt')
    parser.add_argument('--data', type=Path, default=TRAINING_YOLO / 'dataset_signs_10.yaml')
    parser.add_argument('--tag', default='v2')
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        weights = WEIGHTS_DIR / 'best.pt'
    if not weights.is_file():
        raise SystemExit(f'Weights not found: {args.weights}')

    data = abs_yaml(args.data.resolve())
    model = YOLO(str(weights))
    metrics = model.val(data=str(data), plots=True, project=str(EVAL_ROOT / args.tag), name='val')

    names = yaml.safe_load(args.data.read_text(encoding='utf-8')).get('names', {})
    if isinstance(names, dict):
        class_names = {int(k): v for k, v in names.items()}
    else:
        class_names = {i: n for i, n in enumerate(names)}

    box = metrics.box
    per_class = {}
    if hasattr(box, 'ap50') and box.ap50 is not None:
        for idx, ap in enumerate(box.ap50):
            per_class[class_names.get(idx, str(idx))] = {
                'ap50': float(ap),
                'precision': float(box.p[idx]) if box.p is not None else None,
                'recall': float(box.r[idx]) if box.r is not None else None,
            }

    fps = benchmark_fps(model)
    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'data': str(data),
        'map50': float(box.map50) if box.map50 is not None else None,
        'map50_95': float(box.map) if box.map is not None else None,
        'precision': float(box.mp) if box.mp is not None else None,
        'recall': float(box.mr) if box.mr is not None else None,
        'fps_cpu': fps,
        'per_class': per_class,
    }
    out = EVAL_ROOT / args.tag / f'post_train_eval_{args.tag}.json'
    write_json(out, report)
    print(f'mAP@50: {report["map50"]:.4f}' if report['map50'] else 'mAP@50: n/a')
    print(f'FPS (CPU): {fps:.2f}')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
