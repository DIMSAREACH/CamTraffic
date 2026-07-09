"""Task 137 — Validate dataset metadata CSV required fields."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[3]
REQUIRED_FIELDS = [
    'image_id',
    'province',
    'road',
    'gps',
    'weather',
    'time',
    'camera',
    'category',
    'class',
]
ALLOWED_CATEGORIES = {'traffic_sign', 'vehicle', 'license_plate', 'dashcam_frame'}
TIME_RE = re.compile(r'^\d{2}:\d{2}(:\d{2})?$')
GPS_RE = re.compile(r'^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate metadata CSV for Task 137')
    parser.add_argument('--file', default='data/datasets/manifests/metadata.template.csv')
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    metadata_file = resolve(args.file)
    if not metadata_file.exists():
        raise FileNotFoundError(f'Metadata file not found: {metadata_file}')

    with metadata_file.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []

        missing_columns = [field for field in REQUIRED_FIELDS if field not in fieldnames]
        if missing_columns:
            raise ValueError(f'Missing required columns: {", ".join(missing_columns)}')

        issues: list[str] = []
        row_count = 0
        for row_count, row in enumerate(reader, start=2):
            for field in REQUIRED_FIELDS:
                if not (row.get(field) or '').strip():
                    issues.append(f'Row {row_count}: empty `{field}`')

            category = (row.get('category') or '').strip()
            if category and category not in ALLOWED_CATEGORIES:
                issues.append(
                    f'Row {row_count}: invalid `category` {category!r} '
                    f'(allowed: {", ".join(sorted(ALLOWED_CATEGORIES))})'
                )

            time_val = (row.get('time') or '').strip()
            if time_val and not TIME_RE.match(time_val):
                issues.append(f'Row {row_count}: invalid `time` format {time_val!r}')

            gps_val = (row.get('gps') or '').strip()
            if gps_val and not GPS_RE.match(gps_val):
                issues.append(f'Row {row_count}: invalid `gps` format {gps_val!r}')

    if issues:
        print('Metadata validation FAILED:')
        for issue in issues:
            print(f'- {issue}')
        raise SystemExit(1)

    print(f'Metadata validation PASSED for {metadata_file} ({row_count - 1 if row_count else 0} row(s)).')


if __name__ == '__main__':
    main()
