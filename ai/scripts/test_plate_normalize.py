#!/usr/bin/env python
"""Phase B3: unit checks for Cambodia plate OCR normalization (no EasyOCR required)."""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2] / 'src' / 'backend'
sys.path.insert(0, str(BACKEND))

# Minimal Django-free import path: load plate_ocr helpers by exec of normalize only
# Prefer importing after django setup when available; else copy-test via importlib.

def main() -> int:
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    django.setup()
    from ai_detection.plate_ocr import normalize_plate_text, classify_plate_type, lookup_plate_province

    cases = [
        ('2A-1234', '2A-1234'),
        ('2A1234', '2A-1234'),
        ('12AB1234', '12AB-1234'),
        ('2O-1234', '2O-1234'),  # letter O kept
        ('12AB-12B4', '12AB-1284'),  # serial B→8 after dash
        ('12AB-12O4', '12AB-1204'),  # serial O→0
        ('  2a 1234 ', '2A-1234'),
    ]
    ok = 0
    for raw, expected in cases:
        got = normalize_plate_text(raw)
        status = 'OK' if got == expected else 'FAIL'
        if got == expected:
            ok += 1
        print(f'{status:4} {raw!r:20} → {got!r:15} (want {expected!r})')

    # province lookup
    prov = lookup_plate_province('12A-1234')
    print('province 12:', prov)
    print('type 2A-1234:', classify_plate_type('2A-1234'))
    print(f'Passed {ok}/{len(cases)} normalize cases')
    return 0 if ok == len(cases) else 1


if __name__ == '__main__':
    raise SystemExit(main())
