#!/usr/bin/env python
"""Interactive OCR transcription review against manifest."""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
DEFAULT = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'


def main() -> int:
    parser = argparse.ArgumentParser(description='Review OCR transcriptions')
    parser.add_argument('--manifest', type=Path, default=DEFAULT)
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()

    rows = list(csv.DictReader(args.manifest.open(encoding='utf-8')))[: args.limit]
    for i, row in enumerate(rows, 1):
        print(f"\n[{i}/{len(rows)}] {row['image_id']}")
        print(f"  class: {row.get('plate_class', '')}")
        print(f"  transcription: {row.get('transcription', '')}")
        print(f"  verified: {row.get('verified', '')}")
    print(f'\nReviewed {len(rows)} entries. Update verified=manual in {args.manifest} as needed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
