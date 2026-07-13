#!/usr/bin/env python
"""EasyOCR baseline on plate OCR manifest."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
EVAL_ROOT = AI_ROOT / 'runs' / 'evaluation'
OCR_MANIFEST = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        d[i][0] = i
    for j in range(len(hyp) + 1):
        d[0][j] = j
    for i, rc in enumerate(ref, 1):
        for j, hc in enumerate(hyp, 1):
            cost = 0 if rc == hc else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    return d[len(ref)][len(hyp)] / len(ref)


def main() -> int:
    parser = argparse.ArgumentParser(description='OCR baseline evaluation')
    parser.add_argument('--manifest', type=Path, default=OCR_MANIFEST)
    parser.add_argument('--limit', type=int, default=50)
    args = parser.parse_args()

    import easyocr
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)

    rows = list(csv.DictReader(args.manifest.open(encoding='utf-8')))
    if args.limit:
        rows = rows[: args.limit]

    n = 0
    exact = 0
    cer_sum = 0.0
    for row in rows:
        path = Path(row['crop_path'])
        if not path.is_file():
            continue
        ref = row['transcription'].upper().replace(' ', '')
        result = reader.readtext(str(path), detail=0, paragraph=False)
        hyp = ''.join(result).upper().replace(' ', '')
        c = cer(ref, hyp)
        cer_sum += c
        if c == 0:
            exact += 1
        n += 1

    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'engine': 'easyocr',
        'samples': n,
        'cer': cer_sum / n if n else None,
        'exact_match_rate': exact / n if n else None,
    }
    EVAL_ROOT.mkdir(parents=True, exist_ok=True)
    out = EVAL_ROOT / 'ocr_baseline.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'Samples: {n}')
    if report['cer'] is not None:
        print(f"CER: {report['cer']:.3f}")
        print(f"EM: {report['exact_match_rate']:.3f}")
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
