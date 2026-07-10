"""Task 263 — PaddleOCR vs EasyOCR Comparison on Cambodia plate crops.

Loads the OCR manifest, runs both engines (if installed) on the val crops,
and reports CER and Exact Match Rate side by side.

PaddleOCR fallback: if paddleocr is not installed, a mock result using
EasyOCR-improved post-processing is used for comparison.

Usage:
    python training/ocr/compare_engines.py
    python training/ocr/compare_engines.py --manifest data/datasets/manifests/ocr_manifest.csv --n 50
    python training/ocr/compare_engines.py --output runs/ocr/evaluation/engine_comparison.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


# ── Plate normalizer (mirrors app/ocr/service.py) ─────────────────────────────

_KH_PLATE_PATTERNS = [
    re.compile(r'[1-9][A-Z]{1,3}[-.:,/\\\][0-9]{3,7}[A-Z0-9]*', re.IGNORECASE),
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
            cur.append(min(cur[j-1]+1, prev[j]+1, prev[j-1]+(ac != bc)))
        prev = cur
    return prev[-1]


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein(ref, hyp) / len(ref)


def norm_text(v: str) -> str:
    return ''.join(v.split()).upper()


# ── Engine adapters ───────────────────────────────────────────────────────────

def _run_easyocr(img_rgb) -> str:
    try:
        from app.ocr.model_loader import get_reader, should_use_mock
        if should_use_mock():
            return 'MOCK'
        raw = ''.join(
            t for _, t, _ in get_reader().reader.readtext(img_rgb, detail=1, paragraph=False)
        )
        return normalize_plate(raw)
    except Exception as exc:
        return f'ERR:{exc}'


def _run_paddleocr(img_bgr) -> str:
    try:
        from paddleocr import PaddleOCR  # type: ignore[import]
        ocr = PaddleOCR(use_angle_cls=False, lang='en', show_log=False)
        result = ocr.ocr(img_bgr, cls=False)
        raw = ''
        if result and result[0]:
            raw = ' '.join(item[1][0] for item in result[0] if item)
        return normalize_plate(raw)
    except ImportError:
        return 'PADDLE_NOT_INSTALLED'
    except Exception as exc:
        return f'ERR:{exc}'


# ── Argument parsing ──────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='PaddleOCR vs EasyOCR comparison')
    p.add_argument('--manifest', default='data/datasets/manifests/ocr_manifest.csv')
    p.add_argument('--split', default='val', choices=['train', 'val', 'test', 'all'])
    p.add_argument('--n', type=int, default=50)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--output', default='runs/ocr/evaluation/engine_comparison.json')
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    import random
    args          = parse_args()
    manifest_path = resolve(args.manifest)
    output_path   = resolve(args.output)

    if not manifest_path.exists():
        print(f'Manifest not found: {manifest_path}')
        sys.exit(1)

    try:
        import cv2  # type: ignore[import]
        import numpy as np
    except ImportError:
        print('Install: pip install opencv-python numpy')
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

    print(f'Comparing EasyOCR vs PaddleOCR on {len(rows)} samples...')

    stats: dict[str, dict] = {
        'easyocr':  {'cer_sum': 0.0, 'exact': 0, 'time_ms': 0.0, 'n': 0},
        'paddleocr': {'cer_sum': 0.0, 'exact': 0, 'time_ms': 0.0, 'n': 0},
    }
    paddle_available = True
    details = []

    for row in rows:
        ref      = norm_text(row.get('transcription', ''))
        crop_p   = Path(row.get('crop_path', ''))
        if not crop_p.is_absolute():
            crop_p = SERVICE_ROOT / crop_p
        if not crop_p.exists():
            continue

        img_bgr = cv2.imread(str(crop_p))
        if img_bgr is None:
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # EasyOCR
        t0   = time.perf_counter()
        easy = norm_text(_run_easyocr(img_rgb))
        t_easy = (time.perf_counter() - t0) * 1000

        # PaddleOCR
        t0     = time.perf_counter()
        paddle = _run_paddleocr(img_bgr)
        t_pad  = (time.perf_counter() - t0) * 1000

        if paddle == 'PADDLE_NOT_INSTALLED':
            paddle_available = False
            paddle = easy  # fallback — same as EasyOCR improved

        paddle = norm_text(paddle)

        cer_e = cer(ref, easy)
        cer_p = cer(ref, paddle)

        stats['easyocr']['cer_sum']  += cer_e
        stats['easyocr']['exact']    += int(ref == easy)
        stats['easyocr']['time_ms']  += t_easy
        stats['easyocr']['n']        += 1

        stats['paddleocr']['cer_sum']  += cer_p
        stats['paddleocr']['exact']    += int(ref == paddle)
        stats['paddleocr']['time_ms']  += t_pad
        stats['paddleocr']['n']        += 1

        details.append({
            'sample_id': row.get('sample_id', ''),
            'reference': ref,
            'easyocr':   easy,
            'paddleocr': paddle,
            'cer_easy':  round(cer_e, 4),
            'cer_paddle': round(cer_p, 4),
        })

    # Build report
    comparison: list[dict] = []
    for engine, s in stats.items():
        n = s['n'] or 1
        comparison.append({
            'engine':          engine,
            'available':       engine != 'paddleocr' or paddle_available,
            'samples':         s['n'],
            'mean_cer':        round(s['cer_sum'] / n, 4),
            'exact_match_rate': round(s['exact'] / n, 4),
            'mean_inference_ms': round(s['time_ms'] / n, 2),
        })

    report = {
        'manifest':    str(manifest_path.relative_to(SERVICE_ROOT)),
        'split':       args.split,
        'n_samples':   len(details),
        'paddle_available': paddle_available,
        'comparison':  comparison,
        'winner':      min(comparison, key=lambda x: x['mean_cer'])['engine'],
        'details':     details,
        'note': (
            'PaddleOCR not installed — install via: pip install paddleocr paddlepaddle'
            if not paddle_available else ''
        ),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    # Print table
    bar = '=' * 65
    print(f'\n{bar}')
    print(f' OCR Engine Comparison  |  {len(details)} samples  |  split={args.split}')
    if not paddle_available:
        print(f'  ⚠  PaddleOCR not installed — using EasyOCR as proxy comparison')
    print(bar)
    print(f'  {"Engine":<15} {"CER":>8} {"Exact Match":>12} {"Inference":>12}')
    print(f'  {"-"*50}')
    for c in comparison:
        avail = '' if c['available'] else ' (not installed)'
        print(f'  {c["engine"]:<15} {c["mean_cer"]:>8.4f} {c["exact_match_rate"]:>12.4f} '
              f'{c["mean_inference_ms"]:>10.1f} ms{avail}')
    print(f'  Winner: {report["winner"]} (lower CER)')
    print(bar)
    print(f'  Report: {output_path}')
    print(bar)


if __name__ == '__main__':
    main()
