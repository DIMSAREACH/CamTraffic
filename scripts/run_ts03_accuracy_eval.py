#!/usr/bin/env python
"""
TS-03 — AI detection accuracy evaluation for thesis evidence.

Usage (from project root):
  python scripts/run_ts03_accuracy_eval.py
  python scripts/run_ts03_accuracy_eval.py --min-samples 5

Output:
  docs/thesis_evidence/TS-03/
    README.md
    accuracy_results.csv
    accuracy_summary.json
    accuracy_table.md
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / 'ai'
OUT = ROOT / 'docs' / 'thesis_evidence' / 'TS-03'
BACKEND = ROOT / 'backend'

REFERENCE_ROOT = (
    AI.parent.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'Traffic Sign'
)


def _setup_django() -> None:
    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django

    django.setup()


def _load_yaml_names() -> dict[int, str]:
    import yaml

    data = yaml.safe_load((AI / 'data.yaml').read_text(encoding='utf-8'))
    raw = data.get('names') or {}
    if isinstance(raw, dict):
        return {int(k): str(v) for k, v in raw.items()}
    return {i: str(n) for i, n in enumerate(raw)}


def _catalog_maps() -> tuple[dict[str, str], dict[str, str]]:
    rows = json.loads((AI / 'sign_catalog.json').read_text(encoding='utf-8'))
    class_to_code = {r['class_key']: r['sign_code'] for r in rows}
    code_to_name = {r['sign_code']: r.get('sign_name_en') or r.get('sign_name', '') for r in rows}
    return class_to_code, code_to_name


def _norm_stem(stem: str) -> str:
    import re

    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def _reference_stem_to_class() -> dict[str, str]:
    from build_dataset import STEM_TO_CLASS  # noqa: PLC0415 — ai/ on path below

    return STEM_TO_CLASS


def _ground_truth_from_label(label_path: Path, class_names: dict[int, str]) -> str | None:
    if not label_path.is_file():
        return None
    lines = [ln.strip() for ln in label_path.read_text(encoding='utf-8').splitlines() if ln.strip()]
    if not lines:
        return None
    counts: Counter[int] = Counter()
    for line in lines:
        parts = line.split()
        if parts:
            counts[int(parts[0])] += 1
    cls_id = counts.most_common(1)[0][0]
    return class_names.get(cls_id)


def _evaluate_image(image_path: Path, upload_name: str, expected_code: str, scenario: str) -> dict:
    from ai_detection.services import detect_traffic_sign

    result = detect_traffic_sign(str(image_path), original_filename=upload_name)
    predicted = result.get('sign_code') or ''
    confidence = float(result.get('confidence') or 0)
    correct = predicted == expected_code
    return {
        'scenario': scenario,
        'image': image_path.name,
        'upload_name': upload_name,
        'expected_sign_code': expected_code,
        'predicted_sign_code': predicted,
        'predicted_name': result.get('sign_name_en') or result.get('sign_name', ''),
        'confidence': round(confidence, 1),
        'correct': correct,
        'processing_time_sec': result.get('processing_time', 0),
    }


def _evaluate_val_generic(class_names: dict[int, str], class_to_code: dict[str, str]) -> list[dict]:
    val_images = AI / 'dataset' / 'images' / 'val'
    val_labels = AI / 'dataset' / 'labels' / 'val'
    rows: list[dict] = []
    for image_path in sorted(val_images.glob('*.jpg')):
        class_key = _ground_truth_from_label(val_labels / f'{image_path.stem}.txt', class_names)
        if not class_key:
            continue
        expected = class_to_code.get(class_key, class_key.replace('_', '-'))
        rows.append(
            _evaluate_image(
                image_path,
                upload_name=f'IMG_{image_path.stem[:12]}.jpg',
                expected_code=expected,
                scenario='held_out_val_generic_filename',
            ),
        )
    return rows


def _evaluate_reference_uploads(stem_to_class: dict[str, str], class_to_code: dict[str, str]) -> list[dict]:
    rows: list[dict] = []
    for folder_name in ('01-Sign', '02-Sign'):
        folder = REFERENCE_ROOT / folder_name
        if not folder.is_dir():
            continue
        for image_path in sorted(folder.iterdir()):
            if image_path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                continue
            class_key = stem_to_class.get(_norm_stem(image_path.stem))
            if not class_key:
                continue
            expected = class_to_code.get(class_key, class_key.replace('_', '-'))
            rows.append(
                _evaluate_image(
                    image_path,
                    upload_name=image_path.name,
                    expected_code=expected,
                    scenario='reference_upload_original_filename',
                ),
            )
    return rows


def _summarize(rows: list[dict]) -> dict:
    total = len(rows)
    correct = sum(1 for r in rows if r['correct'])
    confs = [r['confidence'] for r in rows if r['confidence'] > 0]
    return {
        'total': total,
        'correct': correct,
        'incorrect': total - correct,
        'accuracy_pct': round(100 * correct / total, 1) if total else 0.0,
        'avg_confidence_correct': round(
            sum(r['confidence'] for r in rows if r['correct'] and r['confidence'] > 0)
            / max(1, sum(1 for r in rows if r['correct'] and r['confidence'] > 0)),
            1,
        ),
        'avg_confidence_all': round(sum(confs) / len(confs), 1) if confs else 0.0,
    }


def _write_csv(path: Path, rows: list[dict]) -> None:
    fields = [
        'scenario', 'image', 'upload_name', 'expected_sign_code', 'predicted_sign_code',
        'predicted_name', 'confidence', 'correct', 'processing_time_sec',
    ]
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def _markdown_table(rows: list[dict], limit: int | None = None) -> str:
    subset = rows[:limit] if limit else rows
    lines = [
        '| # | Image | Expected | Predicted | Confidence | Correct |',
        '| - | ----- | -------- | --------- | ---------- | ------- |',
    ]
    for i, r in enumerate(subset, 1):
        mark = 'Yes' if r['correct'] else 'No'
        lines.append(
            f"| {i} | `{r['image']}` | {r['expected_sign_code']} | "
            f"{r['predicted_sign_code'] or '—'} | {r['confidence']:.1f}% | {mark} |",
        )
    return '\n'.join(lines)


def _write_reports(all_rows: list[dict], val_rows: list[dict], ref_rows: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    val_summary = _summarize(val_rows)
    ref_summary = _summarize(ref_rows)
    all_summary = _summarize(all_rows)

    summary = {
        'generated_at': ts,
        'model': str((AI / 'weights' / 'best.pt').resolve()),
        'class_count': len(_load_yaml_names()),
        'held_out_val_generic_filename': val_summary,
        'reference_upload_original_filename': ref_summary,
        'combined': all_summary,
    }
    (OUT / 'accuracy_summary.json').write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    _write_csv(OUT / 'accuracy_results.csv', all_rows)

    sample_rows = val_rows[:5] if len(val_rows) >= 5 else val_rows
    table_md = _markdown_table(sample_rows, limit=5)

    (OUT / 'accuracy_table.md').write_text(
        f'# TS-03 Accuracy Table (sample of 5+ held-out images)\n\n'
        f'{table_md}\n\n'
        f'**Held-out val accuracy (generic camera filenames):** '
        f'{val_summary["correct"]}/{val_summary["total"]} '
        f'({val_summary["accuracy_pct"]}%)\n\n'
        f'**Reference upload accuracy (original filenames):** '
        f'{ref_summary["correct"]}/{ref_summary["total"]} '
        f'({ref_summary["accuracy_pct"]}%)\n',
        encoding='utf-8',
    )

    readme = f"""# TS-03 — AI Detection Accuracy Evidence

Generated: {ts}

## Summary

| Scenario | Images | Correct | Accuracy |
| -------- | ------ | ------- | -------- |
| Held-out validation (generic `IMG_*.jpg` upload names) | {val_summary['total']} | {val_summary['correct']} | **{val_summary['accuracy_pct']}%** |
| Reference sign uploads (original filenames / UI samples) | {ref_summary['total']} | {ref_summary['correct']} | **{ref_summary['accuracy_pct']}%** |

Model: `{summary['model']}`  
Classes: {summary['class_count']}

## Files

- `accuracy_results.csv` — full per-image results
- `accuracy_summary.json` — metrics for thesis / dashboard
- `accuracy_table.md` — copy-paste table (5+ samples)

## How to re-run

```bash
python scripts/run_ts03_accuracy_eval.py
```

Or via Django:

```bash
cd backend
python manage.py evaluate_sign_accuracy
```

## Sample results (held-out val, first 5)

{table_md}

## Notes for thesis

- **Held-out val** images are from `ai/dataset/images/val/` (not used in training split).
- Upload names are generic (`IMG_*.jpg`) to simulate real camera photos without filename hints.
- **Reference uploads** match the AI Detection demo (catalog / named reference files).
"""
    (OUT / 'README.md').write_text(readme, encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser(description='TS-03 accuracy evaluation')
    parser.add_argument('--min-samples', type=int, default=5, help='Minimum held-out samples required')
    args = parser.parse_args()

    sys.path.insert(0, str(AI))
    _setup_django()

    class_names = _load_yaml_names()
    class_to_code, _ = _catalog_maps()
    stem_to_class = _reference_stem_to_class()

    val_rows = _evaluate_val_generic(class_names, class_to_code)
    ref_rows = _evaluate_reference_uploads(stem_to_class, class_to_code)
    all_rows = val_rows + ref_rows

    if len(val_rows) < args.min_samples:
        print(f'WARNING: only {len(val_rows)} held-out val images (wanted {args.min_samples}+)')

    _write_reports(all_rows, val_rows, ref_rows)

    val_s = _summarize(val_rows)
    ref_s = _summarize(ref_rows)
    print(f"TS-03 done -> {OUT}")
    print(f"  Held-out val (generic names): {val_s['correct']}/{val_s['total']} = {val_s['accuracy_pct']}%")
    print(f"  Reference uploads:            {ref_s['correct']}/{ref_s['total']} = {ref_s['accuracy_pct']}%")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
