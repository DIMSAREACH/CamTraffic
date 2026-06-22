#!/usr/bin/env python
"""
Benchmark upload vs webcam detection parity (same image, same unified pipeline).

If upload is correct but webcam is wrong → preprocessing or hint-source issue, not the model.

Usage (from repo root):
  python scripts/benchmark_upload_vs_webcam.py
  python scripts/benchmark_upload_vs_webcam.py --class NO_ENTRY
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
AI_ROOT = ROOT / 'ai'
DATASET_10 = AI_ROOT / 'dataset_10'
REPORT_DIR = ROOT / 'docs' / 'reports'

TARGET_CLASSES = [
    'NO_ENTRY',
    'NO_LEFT_TURN',
    'NO_RIGHT_TURN',
    'NO_U_TURN',
    'NO_PARKING',
    'M_STOP',
    'P_SPEED_LIMIT_20_KM_H',
    'P_SPEED_LIMIT_50_KM_H',
    'W_PEDESTRIAN_CROSSING',
    'I_ONE_WAY_TRAFFIC',
]

CLASS_TO_CODE = {
    'NO_ENTRY': 'PW03-R1-04',
    'NO_LEFT_TURN': 'PW03-R1-01',
    'NO_RIGHT_TURN': 'PW03-R1-02',
    'NO_U_TURN': 'PW03-R1-03',
    'NO_PARKING': 'PW03-R2-10',
    'M_STOP': 'M-032',
    'P_SPEED_LIMIT_20_KM_H': 'P-029',
    'P_SPEED_LIMIT_50_KM_H': 'P-030',
    'W_PEDESTRIAN_CROSSING': 'W-040',
    'I_ONE_WAY_TRAFFIC': 'I-064',
}


@dataclass
class BenchRow:
    class_key: str
    expected_code: str
    image: str
    upload_class: str
    upload_code: str
    upload_conf: float
    upload_engine: str
    webcam_class: str
    webcam_code: str
    webcam_conf: float
    webcam_engine: str
    fair_class: str
    fair_conf: float
    fair_engine: str
    same_class: bool
    same_code: bool
    upload_ok: bool
    webcam_ok: bool
    fair_ok: bool
    conf_delta: float
    diagnosis: str


def setup_django() -> None:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    sys.path.insert(0, str(BACKEND))
    import django
    django.setup()


def pick_sample_image(class_key: str) -> Path | None:
    for split in ('train', 'val'):
        folder = DATASET_10 / 'images' / split
        if not folder.is_dir():
            continue
        matches = sorted(folder.glob(f'{class_key}_*'))
        if matches:
            return matches[0]
    return None


def run_detect(image_path: Path, *, original_filename: str, sign_only: bool) -> dict:
    from ai_detection.pipeline import run_detection_pipeline
    from ai_detection.sign_pipeline import prepare_unified_sign_input

    prep = prepare_unified_sign_input(str(image_path), localize=True)
    try:
        out = run_detection_pipeline(
            prep.yolo_path,
            original_filename=original_filename,
            sign_only=sign_only,
            live_fast=False,
            unified_prep=True,
        )
        payload = out['payload']
        return {
            'class_key': (payload.get('class_key') or '').strip(),
            'sign_code': (payload.get('sign_code') or '').strip().upper(),
            'confidence': float(payload.get('display_confidence') or payload.get('confidence') or 0),
            'engine': payload.get('detection_engine') or '',
        }
    finally:
        for p in prep.cleanup_paths:
            Path(p).unlink(missing_ok=True)


def diagnose(row: BenchRow) -> str:
    if row.upload_ok and row.webcam_ok and row.same_class:
        return 'OK — upload and webcam agree (YOLO or same engine)'
    if row.upload_ok and not row.webcam_ok and row.upload_engine == 'filename':
        return 'WEBCAM FAIL — upload used filename hint; webcam relies on YOLO (not preprocessing)'
    if row.upload_ok and not row.webcam_ok and row.same_class is False and row.fair_ok == row.webcam_ok:
        return 'WEBCAM FAIL — YOLO/catalog wrong; upload may use filename hint'
    if row.upload_ok and not row.webcam_ok:
        return 'WEBCAM FAIL — investigate preprocessing or live path'
    if not row.upload_ok and not row.webcam_ok and row.same_class:
        return 'BOTH FAIL — model confusion (upload/webcam agree on wrong class)'
    if not row.upload_ok and not row.webcam_ok:
        return 'BOTH FAIL — model or sample image'
    if row.upload_ok and row.webcam_ok and not row.same_class:
        return 'CLASS MISMATCH — pipeline parity bug'
    return 'REVIEW'


def benchmark(classes: list[str]) -> list[BenchRow]:
    rows: list[BenchRow] = []
    for class_key in classes:
        expected_code = CLASS_TO_CODE[class_key]
        image = pick_sample_image(class_key)
        if image is None:
            rows.append(BenchRow(
                class_key=class_key,
                expected_code=expected_code,
                image='MISSING',
                upload_class='', upload_code='', upload_conf=0, upload_engine='',
                webcam_class='', webcam_code='', webcam_conf=0, webcam_engine='',
                fair_class='', fair_conf=0, fair_engine='',
                same_class=False, same_code=False,
                upload_ok=False, webcam_ok=False, fair_ok=False, conf_delta=0,
                diagnosis='NO SAMPLE IMAGE',
            ))
            continue

        upload = run_detect(
            image,
            original_filename=f'upload-{class_key}.jpg',
            sign_only=False,
        )
        webcam = run_detect(
            image,
            original_filename=f'webcam-{int(time.time() * 1000)}.jpg',
            sign_only=True,
        )
        fair = run_detect(
            image,
            original_filename='webcam-fair-benchmark.jpg',
            sign_only=True,
        )
        upload_class = upload['class_key'].lower()
        webcam_class = webcam['class_key'].lower()
        expected_norm = class_key.lower()

        row = BenchRow(
            class_key=class_key,
            expected_code=expected_code,
            image=image.name,
            upload_class=upload['class_key'],
            upload_code=upload['sign_code'],
            upload_conf=upload['confidence'],
            upload_engine=upload['engine'],
            webcam_class=webcam['class_key'],
            webcam_code=webcam['sign_code'],
            webcam_conf=webcam['confidence'],
            webcam_engine=webcam['engine'],
            fair_class=fair['class_key'],
            fair_conf=fair['confidence'],
            fair_engine=fair['engine'],
            same_class=upload_class == webcam_class and bool(upload_class),
            same_code=upload['sign_code'] == webcam['sign_code'] and bool(upload['sign_code']),
            upload_ok=upload_class == expected_norm,
            webcam_ok=webcam_class == expected_norm,
            fair_ok=fair['class_key'].lower() == expected_norm,
            conf_delta=abs(upload['confidence'] - webcam['confidence']),
            diagnosis='',
        )
        row.diagnosis = diagnose(row)
        rows.append(row)
    return rows


def write_report(rows: list[BenchRow]) -> tuple[Path, Path]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    md_path = REPORT_DIR / f'UPLOAD_VS_WEBCAM_BENCHMARK_{stamp}.md'
    csv_path = REPORT_DIR / f'upload_vs_webcam_benchmark_{stamp}.csv'

    ok = sum(1 for r in rows if r.upload_ok and r.webcam_ok and r.same_class)
    webcam_only_fail = sum(1 for r in rows if r.upload_ok and not r.webcam_ok)
    parity_upload_webcam = sum(1 for r in rows if r.upload_class == r.webcam_class)

    lines = [
        '# Upload vs Webcam Benchmark',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        f'Model: `ai/weights/best.pt` (10-class pilot)',
        f'Dataset samples: `ai/dataset_10/images`',
        '',
        '## Summary',
        '',
        f'| Metric | Value |',
        f'|--------|-------|',
        f'| Classes tested | {len(rows)} |',
        f'| Upload + webcam correct | {ok}/{len(rows)} |',
        f'| Upload/webcam same class_key | {parity_upload_webcam}/{len(rows)} |',
        f'| Upload OK, webcam wrong | {webcam_only_fail} |',
        '',
        '## Interpretation',
        '',
        '- **NO_ENTRY test**: upload `NO_ENTRY` + webcam `NO_ENTRY` on same image.',
        '- **Upload OK + webcam wrong + upload engine `filename`** → filename hint on upload, not OpenCV preprocessing.',
        '- **Upload/webcam same wrong class** → model confusion; parity OK.',
        '- **Fair column** (`webcam-fair-benchmark.jpg`) = generic name YOLO-only baseline.',
        '- **Different class same image** → pipeline parity bug (should not happen with `unified_prep=True`).',
        '',
        '## Results',
        '',
        '| Class | Expected | Upload | Eng | Webcam | Eng | Fair (YOLO) | Parity | Diagnosis |',
        '|-------|----------|--------|-----|--------|-----|-------------|--------|-----------|',
    ]

    with csv_path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        writer.writerow([
            'Class', 'Expected Code', 'Image',
            'Upload Class', 'Upload Code', 'Upload Conf', 'Upload Engine',
            'Webcam Class', 'Webcam Code', 'Webcam Conf', 'Webcam Engine',
            'Fair Class', 'Fair Conf', 'Fair Engine',
            'Same Class', 'Upload OK', 'Webcam OK', 'Fair OK', 'Conf Delta', 'Diagnosis',
        ])
        for r in rows:
            lines.append(
                f'| {r.class_key} | {r.expected_code} | '
                f'{r.upload_class or "—"} ({r.upload_conf:.0f}%) | {r.upload_engine} | '
                f'{r.webcam_class or "—"} ({r.webcam_conf:.0f}%) | {r.webcam_engine} | '
                f'{r.fair_class or "—"} ({r.fair_conf:.0f}%) | '
                f'{"✓" if r.upload_class == r.webcam_class else "✗"} | {r.diagnosis} |'
            )
            writer.writerow([
                r.class_key, r.expected_code, r.image,
                r.upload_class, r.upload_code, f'{r.upload_conf:.2f}',
                r.upload_engine,
                r.webcam_class, r.webcam_code, f'{r.webcam_conf:.2f}',
                r.webcam_engine,
                r.fair_class, f'{r.fair_conf:.2f}', r.fair_engine,
                r.upload_class == r.webcam_class, r.upload_ok, r.webcam_ok, r.fair_ok,
                f'{r.conf_delta:.2f}',
                r.diagnosis,
            ])

    lines.append('')
    md_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return md_path, csv_path


def main() -> None:
    parser = argparse.ArgumentParser(description='Upload vs webcam detection benchmark')
    parser.add_argument('--class', dest='only_class', help='Test one class key only')
    args = parser.parse_args()

    setup_django()

    from django.conf import settings
    model_path = Path(settings.AI_MODEL_PATH)
    if not model_path.is_file():
        raise SystemExit(f'Model not found: {model_path}')

    classes = TARGET_CLASSES
    if args.only_class:
        key = args.only_class.upper().replace('-', '_')
        if key not in TARGET_CLASSES:
            raise SystemExit(f'Unknown class: {args.only_class}')
        classes = [key]

    print(f'Model: {model_path}')
    print('Running upload vs webcam benchmark...\n')
    rows = benchmark(classes)
    md_path, csv_path = write_report(rows)

    print(f'{"Class":<24} {"Upload":<22} {"Webcam":<22} {"Fair":<22} Diagnosis')
    print('-' * 110)
    for r in rows:
        up = f'{r.upload_class or "?"} {r.upload_conf:.0f}% ({r.upload_engine})'
        wc = f'{r.webcam_class or "?"} {r.webcam_conf:.0f}% ({r.webcam_engine})'
        fair = f'{r.fair_class or "?"} {r.fair_conf:.0f}% ({r.fair_engine})'
        print(f'{r.class_key:<24} {up:<22} {wc:<22} {fair:<22} {r.diagnosis}')

    print(f'\nMarkdown: {md_path}')
    print(f'CSV:      {csv_path}')

    failures = [r for r in rows if not (r.upload_ok and r.webcam_ok and r.same_class)]
    if failures:
        print(f'\n{len(failures)} class(es) need review.')
        sys.exit(1)
    print('\nAll classes passed upload/webcam parity.')


if __name__ == '__main__':
    main()
