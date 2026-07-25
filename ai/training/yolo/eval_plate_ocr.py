#!/usr/bin/env python
"""
Evaluate plate Detection + production OCR (normalize, province-aware GT).

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


def _norm(text: str) -> str:
    return (text or '').upper().replace(' ', '').replace('-', '').replace('.', '')


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
    province_ok = 0
    province_total = 0
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
        ok = bool(pred) and (_norm(pred) == _norm(expected))
        if ok:
            exact += 1

        exp_prov = (meta.get('province_en') or '').strip()
        pred_prov = (result.get('plate_province_en') or '').strip()
        prov_match = None
        if exp_prov:
            province_total += 1
            prov_match = bool(pred_prov) and pred_prov.lower() == exp_prov.lower()
            if prov_match:
                province_ok += 1

        rows.append({
            'file': rel,
            'expected': expected,
            'predicted': pred,
            'expected_province': exp_prov or None,
            'predicted_province': pred_prov or None,
            'province_match': prov_match,
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
    if province_total:
        print(
            f'Province match:   {province_ok}/{province_total} '
            f'({100 * province_ok / max(province_total, 1):.1f}%)'
        )
    print()
    for r in rows:
        mark = 'OK' if r['match'] else 'MISS'
        prov = ''
        if r.get('expected_province'):
            pmark = 'OK' if r.get('province_match') else 'MISS'
            prov = f" | prov[{pmark}] {r['expected_province']}→{r.get('predicted_province') or '(none)'}"
        print(f"{mark} {r['expected']:12s} → {(r['predicted'] or '(none)'):12s}{prov}")

    out = SPLIT / 'ocr_eval_results.json'
    out.write_text(json.dumps({
        'summary': {
            'total': total,
            'detected': detected,
            'ocr_match': exact,
            'province_total': province_total,
            'province_match': province_ok,
        },
        'rows': rows,
    }, indent=2), encoding='utf-8')
    print(f'\nSaved: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
