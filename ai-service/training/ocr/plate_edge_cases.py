"""Task 272 — Plate OCR Edge Cases: damaged, dirty, angled, low-resolution plates.

Extends the basic edge-case test (edge_case_test.py) with plate-specific
degradations that are common in Cambodian road conditions:

  - baseline         : original crop
  - scratched        : random horizontal lines (simulating plate scratches)
  - dirty            : blotchy dark patches (mud/dirt on plate)
  - angled_left      : perspective warp — left side compressed (plate at angle)
  - angled_right     : perspective warp — right side compressed
  - faded            : overall brightness drop + saturation reduction (sun-bleached)
  - glare            : bright overexposure in top half (sunlight glare)
  - motion_blur_h    : horizontal motion blur (moving vehicle)
  - low_res          : downsample to 64×24 and upsample (dashcam resolution)
  - partial_damage   : right 40% blacked out (plate corner damage)

Usage:
    python training/ocr/plate_edge_cases.py
    python training/ocr/plate_edge_cases.py --n 40 --output runs/ocr/evaluation/plate_edge_case_report.json
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


# ── Plate normalizer ──────────────────────────────────────────────────────────

_KH_PLATE_PATTERNS = [
    re.compile(r'[1-9][A-Z]{1,3}[-.:,/\\\][0-9]{3,7}[A-Z0-9]*', re.IGNORECASE),
    re.compile(r'[1-9][A-Z0-9]{1,2}[-.:,]?[0-9]{3,6}', re.IGNORECASE),
    re.compile(r'[A-Z0-9]{1,3}[-.:,][0-9]{3,6}[A-Z0-9/|\\]*', re.IGNORECASE),
    re.compile(r'[A-Z0-9][A-Z0-9\-.:,]{3,11}', re.IGNORECASE),
]
_PLATE_PATTERN = re.compile(r'^[A-Z0-9][A-Z0-9\-\s]{2,12}$', re.IGNORECASE)


def normalize_plate(raw: str) -> str:
    c = re.sub(r'\s+', '', raw.upper())
    if _PLATE_PATTERN.match(c):
        return c
    best = ''
    for pat in _KH_PLATE_PATTERNS:
        for m in pat.findall(c):
            if len(m) > len(best):
                best = m
        if best and len(best) >= 5:
            break
    return (best or c)[:20]


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ac in enumerate(a, 1):
        cur = [i]
        for j, bc in enumerate(b, 1):
            cur.append(min(cur[j-1]+1, prev[j]+1, prev[j-1]+(ac != bc)))
        prev = cur
    return prev[-1]


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein(ref, hyp) / len(ref)


# ── Plate-specific degradations ───────────────────────────────────────────────

def _apply_plate_condition(img_rgb, condition: str, rng: random.Random):
    """Apply a plate-specific degradation. Returns ndarray."""
    import numpy as np
    import cv2  # type: ignore[import]

    h, w = img_rgb.shape[:2]
    img = img_rgb.copy().astype(np.float32)

    if condition == 'baseline':
        return img_rgb

    elif condition == 'scratched':
        result = img_rgb.copy()
        for _ in range(rng.randint(3, 8)):
            y = rng.randint(0, h - 1)
            thickness = rng.randint(1, 2)
            cv2.line(result, (0, y), (w, y + rng.randint(-3, 3)), (180, 180, 180), thickness)
        return result

    elif condition == 'dirty':
        result = img_rgb.copy().astype(np.float32)
        for _ in range(rng.randint(4, 10)):
            cx, cy = rng.randint(0, w), rng.randint(0, h)
            rx, ry = rng.randint(5, 20), rng.randint(3, 12)
            patch = np.zeros_like(result)
            cv2.ellipse(patch, (cx, cy), (rx, ry), 0, 0, 360, (40, 30, 20), -1)
            result = np.clip(result - patch * 0.5, 0, 255)
        return result.astype(np.uint8)

    elif condition == 'angled_left':
        squeeze = int(w * 0.25)
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = np.float32([[squeeze, 0], [w, 0], [w, h], [squeeze, h]])
        M = cv2.getPerspectiveTransform(src, dst)
        return cv2.warpPerspective(img_rgb, M, (w, h))

    elif condition == 'angled_right':
        squeeze = int(w * 0.25)
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = np.float32([[0, 0], [w - squeeze, 0], [w - squeeze, h], [0, h]])
        M = cv2.getPerspectiveTransform(src, dst)
        return cv2.warpPerspective(img_rgb, M, (w, h))

    elif condition == 'faded':
        img = img_rgb.astype(np.float32)
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 0.4, 0, 255)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 0.7 + 50, 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

    elif condition == 'glare':
        result = img_rgb.copy().astype(np.float32)
        gh = int(h * 0.5)
        result[:gh, :] = np.clip(result[:gh, :] * 2.5, 0, 255)
        return result.astype(np.uint8)

    elif condition == 'motion_blur_h':
        size = 15
        kernel = np.zeros((size, size))
        kernel[int((size - 1) / 2), :] = np.ones(size) / size
        return cv2.filter2D(img_rgb, -1, kernel)

    elif condition == 'low_res':
        small = cv2.resize(img_rgb, (64, 24), interpolation=cv2.INTER_AREA)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

    elif condition == 'partial_damage':
        result = img_rgb.copy()
        result[:, int(w * 0.6):] = 0
        return result

    return img_rgb


CONDITIONS = [
    'baseline', 'scratched', 'dirty', 'angled_left', 'angled_right',
    'faded', 'glare', 'motion_blur_h', 'low_res', 'partial_damage',
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Plate OCR edge-case tester')
    p.add_argument('--manifest', default='data/datasets/manifests/ocr_manifest.csv')
    p.add_argument('--split', default='val', choices=['train', 'val', 'test', 'all'])
    p.add_argument('--n', type=int, default=50)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--output', default='runs/ocr/evaluation/plate_edge_case_report.json')
    p.add_argument('--conditions', default=','.join(CONDITIONS))
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def ocr_image(img_rgb) -> str:
    try:
        from app.ocr.model_loader import get_reader, should_use_mock
        if should_use_mock():
            return 'MOCK'
        results = get_reader().reader.readtext(img_rgb, detail=0, paragraph=False)
        raw = ''.join(results).strip()
        return normalize_plate(raw)
    except Exception as exc:
        return f'ERR:{exc}'


def main() -> None:
    args          = parse_args()
    manifest_path = resolve(args.manifest)
    output_path   = resolve(args.output)
    conditions    = [c.strip() for c in args.conditions.split(',') if c.strip()]

    try:
        import numpy as np
        import cv2  # type: ignore[import]
    except ImportError:
        print('Install: pip install numpy opencv-python')
        sys.exit(1)

    if not manifest_path.exists():
        print(f'Manifest not found: {manifest_path}')
        sys.exit(1)

    with manifest_path.open(newline='', encoding='utf-8') as fh:
        rows = [
            r for r in csv.DictReader(fh)
            if (args.split == 'all' or (r.get('split') or '').strip().lower() == args.split)
            and (r.get('transcription') or '').strip()
        ]

    rng = random.Random(args.seed)
    rng.shuffle(rows)
    if args.n and args.n < len(rows):
        rows = rows[:args.n]

    print(f'Testing {len(rows)} plate crops × {len(conditions)} plate-specific conditions...')

    per_condition: dict[str, dict] = {c: {'cer_sum': 0.0, 'exact': 0, 'n': 0} for c in conditions}
    sample_results: list[dict] = []

    for row in rows:
        ref    = re.sub(r'\s+', '', (row.get('transcription') or '').upper())
        crop_p = Path(row.get('crop_path', ''))
        if not crop_p.is_absolute():
            crop_p = SERVICE_ROOT / crop_p
        if not crop_p.exists():
            continue

        img_bgr = cv2.imread(str(crop_p))
        if img_bgr is None:
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        row_result: dict = {'sample_id': row.get('sample_id', ''), 'reference': ref}
        for cond in conditions:
            degraded = _apply_plate_condition(img_rgb, cond, rng)
            hyp      = ocr_image(degraded)
            c        = cer(ref, hyp)
            per_condition[cond]['cer_sum'] += c
            per_condition[cond]['exact']   += int(ref == hyp)
            per_condition[cond]['n']       += 1
            row_result[cond] = {'hypothesis': hyp, 'cer': round(c, 4), 'exact': ref == hyp}

        sample_results.append(row_result)

    summary: list[dict] = []
    for cond in conditions:
        s = per_condition[cond]
        n = s['n'] or 1
        summary.append({
            'condition':        cond,
            'samples':          s['n'],
            'mean_cer':         round(s['cer_sum'] / n, 4),
            'exact_match_rate': round(s['exact'] / n, 4),
        })

    report = {
        'manifest':   str(manifest_path.relative_to(SERVICE_ROOT)),
        'split':      args.split,
        'n_samples':  len(sample_results),
        'conditions': conditions,
        'summary':    summary,
        'details':    sample_results,
        'notes': (
            'Plate-specific degradations: scratches, dirt, perspective angle, '
            'fade, glare, motion blur, low resolution, and partial damage. '
            'These model real-world dashcam capture conditions in Cambodia.'
        ),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    bar = '=' * 65
    print(f'\n{bar}')
    print(f' Plate OCR Edge-Case Test  |  {len(sample_results)} plates  |  split={args.split}')
    print(bar)
    print(f'  {"Condition":<22} {"Samples":>8} {"Mean CER":>10} {"Exact Match":>12}')
    print(f'  {"-"*56}')
    for s in summary:
        flag = ' ✓' if s['exact_match_rate'] >= 0.15 else ''
        print(f'  {s["condition"]:<22} {s["samples"]:>8} {s["mean_cer"]:>10.4f} '
              f'{s["exact_match_rate"]:>12.4f}{flag}')
    print(bar)
    print(f'  Report: {output_path}')
    print(bar)


if __name__ == '__main__':
    main()
