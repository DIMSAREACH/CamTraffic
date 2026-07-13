#!/usr/bin/env python
"""OCR fine-tune launcher — prereq check + post-processing guidance."""
from __future__ import annotations

import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'


def main() -> int:
    missing = []
    if not MANIFEST.is_file():
        missing.append(str(MANIFEST))
    try:
        import easyocr  # noqa: F401
    except ImportError:
        missing.append('easyocr (pip install easyocr)')

    if missing:
        print('Missing prerequisites:')
        for m in missing:
            print(f'  - {m}')
        return 1

    print('OCR fine-tuning prerequisites OK.')
    print('Run baseline: python ai/training/ocr/ocr_baseline.py')
    print('Improvements: normalize PP/KP prefixes, strip non-alphanumeric, Khmer digit map.')
    print('See docs/training/OCR-FINETUNING-GUIDE.md')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
