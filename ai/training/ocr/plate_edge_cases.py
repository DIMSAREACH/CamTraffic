#!/usr/bin/env python
"""Plate OCR robustness under degradations."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

AI_ROOT = Path(__file__).resolve().parents[2]
EVAL_ROOT = AI_ROOT / 'runs' / 'evaluation'
CROPS = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'crops'

CONDITIONS = [
    'scratches', 'dirt', 'angle', 'fade', 'glare',
    'motion_blur', 'low_res', 'partial_damage', 'noise', 'contrast',
]


def degrade(img: np.ndarray, name: str) -> np.ndarray:
    h, w = img.shape[:2]
    if name == 'scratches':
        out = img.copy()
        for _ in range(5):
            x1, y1 = np.random.randint(0, w), np.random.randint(0, h)
            cv2.line(out, (x1, y1), (x1 + 30, y1 + 5), (128, 128, 128), 1)
        return out
    if name == 'dirt':
        out = img.copy()
        for _ in range(40):
            cv2.circle(out, (np.random.randint(0, w), np.random.randint(0, h)), 2, (80, 60, 40), -1)
        return out
    if name == 'angle':
        m = cv2.getRotationMatrix2D((w / 2, h / 2), 12, 1.0)
        return cv2.warpAffine(img, m, (w, h))
    if name == 'fade':
        return np.clip(img.astype(np.float32) * 0.6 + 60, 0, 255).astype(np.uint8)
    if name == 'glare':
        out = img.copy()
        cv2.ellipse(out, (w // 2, h // 3), (w // 3, h // 4), 0, 0, 360, (255, 255, 255), -1)
        return cv2.addWeighted(img, 0.7, out, 0.3, 0)
    if name == 'motion_blur':
        k = np.zeros((9, 9))
        k[4, :] = 1 / 9
        return cv2.filter2D(img, -1, k)
    if name == 'low_res':
        small = cv2.resize(img, (max(w // 4, 1), max(h // 4, 1)))
        return cv2.resize(small, (w, h))
    if name == 'partial_damage':
        out = img.copy()
        cv2.rectangle(out, (0, 0), (w // 3, h), (0, 0, 0), -1)
        return out
    if name == 'noise':
        n = np.random.randint(0, 50, img.shape, dtype=np.uint8)
        return np.clip(img.astype(np.int16) + n, 0, 255).astype(np.uint8)
    if name == 'contrast':
        return cv2.convertScaleAbs(img, alpha=1.8, beta=-40)
    return img


def main() -> int:
    parser = argparse.ArgumentParser(description='Plate OCR edge cases')
    parser.add_argument('--limit', type=int, default=5)
    args = parser.parse_args()

    import easyocr
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    images = sorted(CROPS.glob('*.jpg'))[: args.limit]
    summary = {}
    for path in images:
        img = cv2.imread(str(path))
        row = {}
        for cond in CONDITIONS:
            sample = degrade(img, cond)
            text = ''.join(reader.readtext(sample, detail=0)).upper()
            row[cond] = bool(text)
        summary[path.name] = row

    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'conditions': CONDITIONS,
        'results': summary,
    }
    EVAL_ROOT.mkdir(parents=True, exist_ok=True)
    out = EVAL_ROOT / 'plate_ocr_edge_cases.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'Tested {len(summary)} crops → {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
