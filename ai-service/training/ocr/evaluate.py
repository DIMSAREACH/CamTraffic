"""Task 132 — Evaluate OCR recognition quality on a manifest split."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Evaluate OCR CER on annotated plate crops')
    parser.add_argument('--manifest', required=True, help='Path to OCR manifest CSV')
    parser.add_argument('--split', default='val', choices=['train', 'val', 'test'])
    parser.add_argument(
        '--output',
        default='runs/ocr/evaluation/report.json',
        help='JSON report output path',
    )
    parser.add_argument('--service-root', default='', help='ai-service root (auto-detected if empty)')
    return parser.parse_args()


def levenshtein(reference: str, hypothesis: str) -> int:
    if reference == hypothesis:
        return 0
    if not reference:
        return len(hypothesis)
    if not hypothesis:
        return len(reference)

    previous = list(range(len(hypothesis) + 1))
    for i, ref_char in enumerate(reference, start=1):
        current = [i]
        for j, hyp_char in enumerate(hypothesis, start=1):
            insert_cost = current[j - 1] + 1
            delete_cost = previous[j] + 1
            replace_cost = previous[j - 1] + (ref_char != hyp_char)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


def character_error_rate(reference: str, hypothesis: str) -> float:
    if not reference:
        return 0.0 if not hypothesis else 1.0
    return levenshtein(reference, hypothesis) / len(reference)


def normalize_text(value: str) -> str:
    return ''.join(value.split()).upper()


def read_rows(manifest_path: Path, split: str) -> list[dict[str, str]]:
    with manifest_path.open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        return [
            row
            for row in reader
            if (row.get('split') or '').strip().lower() == split and (row.get('transcription') or '').strip()
        ]


def predict_text(image_path: Path) -> str:
    try:
        from app.ocr.model_loader import get_reader, should_use_mock
    except ImportError:
        should_use_mock = lambda: True  # noqa: E731
        get_reader = None  # type: ignore[assignment]

    if should_use_mock() or get_reader is None:
        return 'MOCK'

    reader = get_reader().reader
    results = reader.readtext(str(image_path), detail=0, paragraph=False)
    return ''.join(results).strip()


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        raise FileNotFoundError(f'Manifest not found: {manifest_path}')

    service_root = Path(args.service_root) if args.service_root else manifest_path.resolve().parents[2]
    rows = read_rows(manifest_path, args.split)
    if not rows:
        raise ValueError(f'No annotated rows found for split={args.split} in {manifest_path}')

    samples: list[dict[str, object]] = []
    cer_total = 0.0
    exact_matches = 0

    for row in rows:
        crop_path = Path(row['crop_path'])
        if not crop_path.is_absolute():
            crop_path = service_root / crop_path
        if not crop_path.exists():
            raise FileNotFoundError(f'Crop not found: {crop_path}')

        reference = normalize_text(row['transcription'])
        hypothesis = normalize_text(predict_text(crop_path))
        cer = character_error_rate(reference, hypothesis)
        exact = reference == hypothesis

        cer_total += cer
        exact_matches += int(exact)
        samples.append(
            {
                'sample_id': row['sample_id'],
                'reference': reference,
                'hypothesis': hypothesis,
                'cer': round(cer, 4),
                'exact_match': exact,
            }
        )

    summary = {
        'split': args.split,
        'samples': len(samples),
        'mean_cer': round(cer_total / len(samples), 4),
        'exact_match_rate': round(exact_matches / len(samples), 4),
        'details': samples,
    }

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = service_root / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2), encoding='utf-8')

    print(f'Evaluated {len(samples)} sample(s) on split={args.split}')
    print(f'  mean CER: {summary["mean_cer"]}')
    print(f'  exact match rate: {summary["exact_match_rate"]}')
    print(f'Report: {output_path}')


if __name__ == '__main__':
    main()
