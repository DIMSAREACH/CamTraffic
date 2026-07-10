"""Task 180 — Test OCR on edge cases (night, rain, partial occlusion, blur).

Applies synthetic image degradations to a sample of val plate crops,
runs EasyOCR (or the improved post-processor) on each variant,
and reports accuracy per condition.

Conditions tested:
  - baseline      : original crop
  - dark          : night / under-exposure (brightness -60%)
  - overexposed   : sun glare (brightness +60%)
  - rain_blur     : Gaussian blur (σ=2) simulating rain drops
  - heavy_blur    : heavy blur (σ=4) simulating motion / defocus
  - low_contrast  : compressed dynamic range
  - partial_occlusion : top 30% of image blacked out
  - noise         : salt-and-pepper noise

Usage:
    python training/ocr/edge_case_test.py
    python training/ocr/edge_case_test.py --manifest data/datasets/manifests/ocr_manifest.csv --n 50
    python training/ocr/edge_case_test.py --n 30 --output runs/ocr/evaluation/edge_case_report.json
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


# ── Plate normalizer (mirrors app/ocr/service.py) ─────────────────────────────

_KH_PLATE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'[1-9][A-Z]{1,3}[-.:,/\\][0-9]{3,7}[A-Z0-9]*', re.IGNORECASE),
    re.compile(r'[1-9][A-Z0-9]{1,2}[-.:,]?[0-9]{3,6}', re.IGNORECASE),
    re.compile(r'[A-Z0-9]{1,3}[-.:,][0-9]{3,6}[A-Z0-9/|\\]*', re.IGNORECASE),
    re.compile(r'[A-Z0-9][A-Z0-9\-.:,]{3,11}', re.IGNORECASE),
]
_PLATE_PATTERN = re.compile(r'^[A-Z0-9][A-Z0-9\-\s]{2,12}$', re.IGNORECASE)


def _extract_plate(text: str) -> str:
    best = ''
    for pat in _KH_PLATE_PATTERNS:
        for m in pat.findall(text):
            if len(m) > len(best):
                best = m
        if best and len(best) >= 5:
            break
    return best


def normalize_plate(raw: str) -> str:
    c = re.sub(r'\s+', '', raw.upper())
    if _PLATE_PATTERN.match(c):
        return c
    ex = _extract_plate(c)
    return (ex or c)[:20]


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ac in enumerate(a, 1):
        cur = [i]
        for j, bc in enumerate(b, 1):
            cur.append(min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (ac != bc)))
        prev = cur
    return prev[-1]


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein(ref, hyp) / len(ref)


# ── Image degradation helpers ─────────────────────────────────────────────────

def _apply_condition(img_rgb, condition: str, rng: random.Random):
    """Apply a degradation condition to an RGB numpy array.  Returns ndarray."""
    import numpy as np
    import cv2  # type: ignore[import]

    img = img_rgb.copy().astype(np.float32)
    h, w = img.shape[:2]

    if condition == 'baseline':
        return img_rgb

    elif condition == 'dark':
        img = np.clip(img * 0.35, 0, 255)

    elif condition == 'overexposed':
        img = np.clip(img * 1.8, 0, 255)

    elif condition == 'rain_blur':
        blurred = cv2.GaussianBlur(img_rgb, (0, 0), sigmaX=2, sigmaY=2)
        return blurred

    elif condition == 'heavy_blur':
        blurred = cv2.GaussianBlur(img_rgb, (0, 0), sigmaX=4, sigmaY=4)
        return blurred

    elif condition == 'low_contrast':
        img = img * 0.4 + 100

    elif condition == 'partial_occlusion':
        result = img_rgb.copy()
        result[:int(h * 0.3), :] = 0
        return result

    elif condition == 'noise':
        noise = np.random.RandomState(rng.randint(0, 9999)).randint(
            -40, 40, img_rgb.shape, dtype=np.int32
        )
        img = np.clip(img + noise, 0, 255)

    return img.astype(np.uint8)


# ── Argument parsing ──────────────────────────────────────────────────────────

CONDITIONS = [
    'baseline', 'dark', 'overexposed', 'rain_blur',
    'heavy_blur', 'low_contrast', 'partial_occlusion', 'noise',
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='OCR edge-case stress test')
    p.add_argument('--manifest',
                   default='data/datasets/manifests/ocr_manifest.csv',
                   help='OCR manifest CSV')
    p.add_argument('--split', default='val', choices=['train', 'val', 'test', 'all'])
    p.add_argument('--n', type=int, default=50,
                   help='Number of val samples to test (0 = all)')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--output',
                   default='runs/ocr/evaluation/edge_case_report.json')
    p.add_argument('--conditions', default=','.join(CONDITIONS),
                   help='Comma-separated list of conditions to test')
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


# ── OCR inference ─────────────────────────────────────────────────────────────

def ocr_image(img_rgb) -> str:
    """Run EasyOCR (or mock) and return normalized plate text."""
    try:
        from app.ocr.model_loader import get_reader, should_use_mock
        if should_use_mock():
            return 'MOCK'
        reader = get_reader().reader
        results = reader.readtext(img_rgb, detail=0, paragraph=False)
        raw = ''.join(results).strip()
        return normalize_plate(raw)
    except Exception as exc:
        return f'ERR:{exc}'


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    manifest_path = resolve(args.manifest)
    output_path   = resolve(args.output)
    conditions    = [c.strip() for c in args.conditions.split(',') if c.strip()]

    try:
        import numpy as np
        import cv2  # type: ignore[import]
    except ImportError:
        print('numpy and opencv-python are required.  pip install numpy opencv-python')
        sys.exit(1)

    if not manifest_path.exists():
        print(f'Manifest not found: {manifest_path}')
        sys.exit(1)

    with manifest_path.open(newline='', encoding='utf-8') as fh:
        rows = [r for r in csv.DictReader(fh)
                if (args.split == 'all' or (r.get('split') or '').strip().lower() == args.split)
                and (r.get('transcription') or '').strip()]

    if not rows:
        print(f'No annotated rows found for split={args.split}')
        sys.exit(1)

    rng = random.Random(args.seed)
    rng.shuffle(rows)
    if args.n and args.n < len(rows):
        rows = rows[:args.n]

    print(f'Testing {len(rows)} samples across {len(conditions)} conditions...')
    print(f'Conditions: {conditions}\n')

    per_condition: dict[str, dict] = {c: {'cer_sum': 0.0, 'exact': 0, 'n': 0} for c in conditions}
    sample_results: list[dict] = []

    for row in rows:
        ref = re.sub(r'\s+', '', (row.get('transcription') or '').upper())
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
            degraded = _apply_condition(img_rgb, cond, rng)
            hyp = ocr_image(degraded)
            c = cer(ref, hyp)
            per_condition[cond]['cer_sum'] += c
            per_condition[cond]['exact'] += int(ref == hyp)
            per_condition[cond]['n'] += 1
            row_result[cond] = {'hypothesis': hyp, 'cer': round(c, 4), 'exact': ref == hyp}

        sample_results.append(row_result)

    # Build summary.
    summary: list[dict] = []
    for cond in conditions:
        stats = per_condition[cond]
        n = stats['n'] or 1
        summary.append({
            'condition':        cond,
            'samples':          stats['n'],
            'mean_cer':         round(stats['cer_sum'] / n, 4),
            'exact_match_rate': round(stats['exact'] / n, 4),
        })

    report = {
        'manifest':    str(manifest_path.relative_to(SERVICE_ROOT)),
        'split':       args.split,
        'n_samples':   len(rows),
        'conditions':  conditions,
        'summary':     summary,
        'details':     sample_results,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    # Print table.
    bar = '=' * 62
    print(f'\n{bar}')
    print(f' OCR Edge-Case Test  |  {len(rows)} samples  |  split={args.split}')
    print(f'{bar}')
    print(f'{"Condition":<22} {"Samples":>8} {"Mean CER":>10} {"Exact Match":>12}')
    print(f'{"-"*62}')
    for s in summary:
        flag = ' ✓' if s['exact_match_rate'] >= 0.15 else ''
        print(f'{s["condition"]:<22} {s["samples"]:>8} {s["mean_cer"]:>10.4f} {s["exact_match_rate"]:>12.4f}{flag}')
    print(f'{bar}')
    print(f'Report: {output_path}')
    print(f'{bar}\n')


if __name__ == '__main__':
    main()
