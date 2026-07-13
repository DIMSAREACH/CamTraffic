#!/usr/bin/env python
"""Compare PaddleOCR vs EasyOCR on plate samples."""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
EVAL_ROOT = AI_ROOT / 'runs' / 'evaluation'
MANIFEST = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'


def main() -> int:
    parser = argparse.ArgumentParser(description='Compare OCR engines')
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()

    import easyocr
    easy = easyocr.Reader(['en'], gpu=False, verbose=False)
    paddle = None
    try:
        from paddleocr import PaddleOCR
        paddle = PaddleOCR(use_angle_cls=False, lang='en', show_log=False)
    except ImportError:
        print('PaddleOCR not installed — EasyOCR only')

    rows = list(csv.DictReader(MANIFEST.open(encoding='utf-8')))[: args.limit]
    results = []
    for row in rows:
        path = Path(row['crop_path'])
        if not path.is_file():
            continue
        easy_text = ''.join(easy.readtext(str(path), detail=0)).upper()
        paddle_text = ''
        if paddle:
            out = paddle.ocr(str(path), cls=False)
            if out and out[0]:
                paddle_text = ''.join([line[1][0] for line in out[0]]).upper()
        results.append({
            'image': row['image_id'],
            'reference': row['transcription'],
            'easyocr': easy_text,
            'paddleocr': paddle_text or None,
        })

    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'samples': len(results),
        'paddle_available': paddle is not None,
        'results': results,
    }
    EVAL_ROOT.mkdir(parents=True, exist_ok=True)
    out = EVAL_ROOT / 'ocr_engine_comparison.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'Compared {len(results)} plates → {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
