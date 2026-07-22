"""Production OCR evaluation using CamTraffic normalize + EasyOCR."""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
BACKEND = AI_ROOT.parent / 'backend'
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from ai_detection.plate_ocr import normalize_plate_text, recognize_plate  # noqa: E402

OCR_MANIFEST = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'
EVAL_ROOT = AI_ROOT / 'runs' / 'evaluation'


def main() -> int:
    parser = argparse.ArgumentParser(description='Production OCR eval (recognize_plate + manifest)')
    parser.add_argument('--manifest', type=Path, default=OCR_MANIFEST)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--min-exact-rate', type=float, default=0.35)
    args = parser.parse_args()

    rows = list(csv.DictReader(args.manifest.open(encoding='utf-8')))
    if args.limit:
        rows = rows[: args.limit]

    exact = 0
    norm_hits = 0
    n = 0
    for row in rows:
        path = Path(row['crop_path'])
        if not path.is_file():
            continue
        ref = normalize_plate_text(row['transcription']) or row['transcription'].upper().replace(' ', '')
        result = recognize_plate(str(path), vehicles=[])
        hyp = normalize_plate_text(result.get('plate_text', '')) or (result.get('plate_text') or '').upper()
        if hyp == ref:
            exact += 1
        if ref and hyp and ref.replace('-', '') == hyp.replace('-', ''):
            norm_hits += 1
        n += 1

    rate = exact / n if n else 0.0
    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'engine': 'camtraffic_recognize_plate',
        'samples': n,
        'exact_match_rate': rate,
        'normalized_match_rate': norm_hits / n if n else 0.0,
        'min_exact_rate': args.min_exact_rate,
        'pass': rate >= args.min_exact_rate,
    }
    EVAL_ROOT.mkdir(parents=True, exist_ok=True)
    out = EVAL_ROOT / 'ocr_production.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    print(f'Report: {out}')
    return 0 if report['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
