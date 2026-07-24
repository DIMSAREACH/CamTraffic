#!/usr/bin/env python
"""
Evaluate plate Detection + production OCR (normalize, skip province noise).

Usage:
  cd ai && python training/yolo/eval_plate_ocr.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT.parent / 'src' / 'backend'
SPLIT = ROOT / 'datasets' / 'splits' / 'cambodia_license_plates'
WEIGHTS = ROOT / 'weights' / 'best_cambodia_plates.pt'
GT_PATH = SPLIT / 'ocr_ground_truth.json'


def main() -> int:
    if not WEIGHTS.is_file():
        print(f'Weights missing: {WEIGHTS}')
        return 1
    if not GT_PATH.is_file():
        print(f'GT missing: {GT_PATH}')
        return 1

    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    django.setup()

    from ai_detection.plate_detection import detect_plate_boxes
    from ai_detection.plate_ocr import recognize_plate

    gt = json.loads(GT_PATH.read_text(encoding='utf-8'))
    exact = 0
    detected = 0
    total = 0
    rows = []

    for rel, meta in gt.items():
        expected = (meta.get('primary_plate') or '').upper().replace(' ', '')
        if not expected:
            continue
        img_path = SPLIT / rel
        if not img_path.is_file():
            continue
        total += 1
        boxes = detect_plate_boxes(img_path)
        if boxes:
            detected += 1
        result = recognize_plate(str(img_path), vehicles=None)
        pred = (result.get('plate_text') or '').upper()
        exp_nodash = expected.replace('-', '').replace('.', '')
        pred_nodash = pred.replace('-', '').replace('.', '')
        # Strict: exact or dash-insensitive exact (no substring false positives)
        ok = bool(pred) and (pred == expected or exp_nodash == pred_nodash)
        if ok:
            exact += 1
        rows.append({
            'file': rel,
            'expected': expected,
            'predicted': pred,
            'ocr_conf': result.get('plate_confidence'),
            'engine': result.get('ocr_engine'),
            'detector': result.get('plate_detector'),
            'match': ok,
        })

    print('=' * 70)
    print('Cambodia Plate Detection + Production OCR Evaluation')
    print('=' * 70)
    print(f'Images evaluated: {total}')
    print(f'Plate detected:   {detected}/{total} ({100 * detected / max(total, 1):.1f}%)')
    print(f'OCR match:        {exact}/{total} ({100 * exact / max(total, 1):.1f}%)')
    print()
    for r in rows:
        mark = '✅' if r['match'] else '❌'
        print(f"{mark} {r['expected']:12s} → {(r['predicted'] or '(none)'):12s}  [{r.get('engine')}]")

    out = SPLIT / 'ocr_eval_results.json'
    out.write_text(json.dumps({
        'summary': {'total': total, 'detected': detected, 'ocr_match': exact},
        'rows': rows,
    }, indent=2), encoding='utf-8')
    print(f'\nSaved: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
