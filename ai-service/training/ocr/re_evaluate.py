"""Task 178 / Task 179 — Re-evaluate OCR with improved post-processing.

Reads the existing baseline evaluation JSON produced by evaluate.py, applies
the improved _normalize_plate logic from app/ocr/service.py to the raw
hypotheses, and reports the delta in CER and Exact Match Rate.

Usage:
    python training/ocr/re_evaluate.py
    python training/ocr/re_evaluate.py --baseline runs/ocr/evaluation/report_val.json
    python training/ocr/re_evaluate.py --raw-manifest data/datasets/manifests/ocr_manifest.csv --split val
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


# ── Plate extraction logic (mirrors app/ocr/service.py) ──────────────────────

_KH_PLATE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'[1-9][A-Z]{1,3}[-.:,/\\][0-9]{3,7}[A-Z0-9]*', re.IGNORECASE),
    re.compile(r'[1-9][A-Z0-9]{1,2}[-.:,]?[0-9]{3,6}', re.IGNORECASE),
    re.compile(r'[A-Z0-9]{1,3}[-.:,][0-9]{3,6}[A-Z0-9/|\\]*', re.IGNORECASE),
    re.compile(r'[A-Z0-9][A-Z0-9\-.:,]{3,11}', re.IGNORECASE),
]
_PLATE_PATTERN = re.compile(r'^[A-Z0-9][A-Z0-9\-\s]{2,12}$', re.IGNORECASE)
_EDGE_NOISE = re.compile(r'^[^A-Z0-9]*|[^A-Z0-9|]*$', re.IGNORECASE)


def _extract_plate_substring(text: str) -> str:
    best = ''
    for pattern in _KH_PLATE_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            candidate = max(matches, key=len)
            if len(candidate) > len(best):
                best = candidate
        if best and len(best) >= 5:
            break
    return best


def normalize_plate(text: str) -> str:
    cleaned = re.sub(r'\s+', '', text.upper())
    if _PLATE_PATTERN.match(cleaned):
        return cleaned
    extracted = _extract_plate_substring(cleaned)
    if extracted:
        return extracted[:20]
    stripped = _EDGE_NOISE.sub('', cleaned)
    return (stripped or cleaned)[:20]


# ── CER helpers ───────────────────────────────────────────────────────────────

def levenshtein(ref: str, hyp: str) -> int:
    if ref == hyp:
        return 0
    if not ref:
        return len(hyp)
    if not hyp:
        return len(ref)
    prev = list(range(len(hyp) + 1))
    for i, rc in enumerate(ref, 1):
        cur = [i]
        for j, hc in enumerate(hyp, 1):
            cur.append(min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (rc != hc)))
        prev = cur
    return prev[-1]


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    return levenshtein(ref, hyp) / len(ref)


def normalize_text(v: str) -> str:
    return ''.join(v.split()).upper()


# ── Argument parsing ──────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Re-evaluate OCR with improved plate extraction')
    p.add_argument('--baseline',
                   default='runs/ocr/evaluation/report_val.json',
                   help='Path to existing evaluate.py JSON report (uses stored hypotheses)')
    p.add_argument('--output',
                   default='runs/ocr/evaluation/report_val_improved.json',
                   help='Output path for improved evaluation report')
    return p.parse_args()


def resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else SERVICE_ROOT / p


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    baseline_path = resolve(args.baseline)
    output_path   = resolve(args.output)

    if not baseline_path.exists():
        print(f'Baseline report not found: {baseline_path}')
        sys.exit(1)

    with baseline_path.open(encoding='utf-8') as fh:
        baseline: dict = json.load(fh)

    details: list[dict] = baseline.get('details', [])
    if not details:
        print('No detail records in baseline report.')
        sys.exit(1)

    improved_details: list[dict] = []
    old_cer_total = 0.0
    new_cer_total = 0.0
    old_exact = 0
    new_exact = 0

    for item in details:
        ref = normalize_text(item.get('reference', ''))
        old_hyp = normalize_text(item.get('hypothesis', ''))

        # Apply improved plate extraction to the raw hypothesis.
        new_hyp = normalize_text(normalize_plate(old_hyp))

        old_c = cer(ref, old_hyp)
        new_c = cer(ref, new_hyp)

        old_cer_total += old_c
        new_cer_total += new_c
        old_exact += int(ref == old_hyp)
        new_exact += int(ref == new_hyp)

        improved_details.append({
            'sample_id':   item.get('sample_id', ''),
            'reference':   ref,
            'old_hypothesis': old_hyp,
            'new_hypothesis': new_hyp,
            'old_cer':     round(old_c, 4),
            'new_cer':     round(new_c, 4),
            'delta_cer':   round(new_c - old_c, 4),
            'old_exact':   ref == old_hyp,
            'new_exact':   ref == new_hyp,
        })

    n = len(details)
    old_mean_cer = round(old_cer_total / n, 4)
    new_mean_cer = round(new_cer_total / n, 4)
    old_em  = round(old_exact / n, 4)
    new_em  = round(new_exact / n, 4)

    # Sort by largest improvement for easy inspection.
    improved_details.sort(key=lambda x: x['delta_cer'])

    report = {
        'split':              baseline.get('split', 'val'),
        'samples':            n,
        'baseline': {
            'mean_cer':         old_mean_cer,
            'exact_match_rate': old_em,
        },
        'improved': {
            'mean_cer':         new_mean_cer,
            'exact_match_rate': new_em,
        },
        'delta': {
            'mean_cer':         round(new_mean_cer - old_mean_cer, 4),
            'exact_match_rate': round(new_em - old_em, 4),
        },
        'details': improved_details,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    # Print summary.
    bar = '=' * 55
    print(f'\n{bar}')
    print(f'OCR Post-Processing Improvement Report')
    print(f'Samples: {n}  |  Split: {baseline.get("split", "val")}')
    print(f'{bar}')
    print(f'{"Metric":<25} {"Baseline":>10} {"Improved":>10} {"Delta":>10}')
    print(f'{"-"*55}')
    print(f'{"Mean CER":<25} {old_mean_cer:>10.4f} {new_mean_cer:>10.4f} {new_mean_cer - old_mean_cer:>+10.4f}')
    print(f'{"Exact Match Rate":<25} {old_em:>10.4f} {new_em:>10.4f} {new_em - old_em:>+10.4f}')
    print(f'{bar}')

    improved_count = sum(1 for d in improved_details if d['delta_cer'] < 0)
    degraded_count = sum(1 for d in improved_details if d['delta_cer'] > 0)
    print(f'Improved: {improved_count} samples  |  Degraded: {degraded_count} samples')
    print(f'\nReport saved: {output_path}')
    print(f'{bar}')


if __name__ == '__main__':
    main()
