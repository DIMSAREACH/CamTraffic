#!/usr/bin/env python
"""Edge-case inference tests (blur, noise, brightness)."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, EVAL_ROOT, WEIGHTS_DIR, write_json


def apply_condition(img: np.ndarray, name: str) -> np.ndarray:
    if name == 'blur':
        return cv2.GaussianBlur(img, (9, 9), 0)
    if name == 'noise':
        noise = np.random.randint(0, 40, img.shape, dtype=np.uint8)
        return np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    if name == 'dark':
        return np.clip(img.astype(np.float32) * 0.5, 0, 255).astype(np.uint8)
    if name == 'bright':
        return np.clip(img.astype(np.float32) * 1.4 + 20, 0, 255).astype(np.uint8)
    if name == 'rain':
        overlay = img.copy()
        for _ in range(200):
            x, y = np.random.randint(0, img.shape[1]), np.random.randint(0, img.shape[0])
            cv2.line(overlay, (x, y), (x - 2, y + 10), (200, 200, 255), 1)
        return cv2.addWeighted(img, 0.7, overlay, 0.3, 0)
    if name == 'occlusion':
        out = img.copy()
        h, w = out.shape[:2]
        cv2.rectangle(out, (w // 4, h // 4), (3 * w // 4, 3 * h // 4), (0, 0, 0), -1)
        return out
    return img


def main() -> int:
    parser = argparse.ArgumentParser(description='Edge case YOLO tests')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best.pt')
    parser.add_argument('--sample', type=Path, default=AI_ROOT / 'dataset_10' / 'images' / 'val')
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        raise SystemExit(f'Weights not found: {weights}')
    images = sorted(args.sample.glob('*.jpg'))[:5]
    if not images:
        raise SystemExit('No sample images')

    model = YOLO(str(weights))
    conditions = ['baseline', 'blur', 'noise', 'dark', 'bright', 'rain', 'occlusion']
    results = {}
    for img_path in images:
        img = cv2.imread(str(img_path))
        row = {}
        for cond in conditions:
            sample = img if cond == 'baseline' else apply_condition(img, cond)
            preds = model.predict(sample, verbose=False)
            n = len(preds[0].boxes) if preds and preds[0].boxes is not None else 0
            row[cond] = n
        results[img_path.name] = row

    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'conditions': conditions,
        'results': results,
    }
    out = EVAL_ROOT / 'edge_case_test.json'
    write_json(out, report)
    print(f'Images tested: {len(results)}')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
