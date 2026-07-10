"""Task 132 — Build EasyOCR recognition dataset from OCR manifest."""

from __future__ import annotations

import argparse
import csv
import random
import shutil
from pathlib import Path

import yaml


REQUIRED_COLUMNS = ('sample_id', 'crop_path', 'transcription', 'split')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Prepare EasyOCR recognition training dataset')
    parser.add_argument('--config', required=True, help='Path to OCR dataset YAML config')
    parser.add_argument(
        '--export-only',
        action='store_true',
        help='Only export dataset layout (default behaviour)',
    )
    return parser.parse_args()


def load_config(config_path: Path) -> dict:
    with config_path.open(encoding='utf-8') as handle:
        return yaml.safe_load(handle)


def read_manifest(manifest_path: Path) -> list[dict[str, str]]:
    if not manifest_path.exists():
        raise FileNotFoundError(
            f'Manifest not found: {manifest_path}. Copy ocr_manifest.template.csv and annotate crops.'
        )

    with manifest_path.open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        rows = [dict(row) for row in reader]

    if not rows:
        raise ValueError(f'Manifest is empty: {manifest_path}')

    missing = [column for column in REQUIRED_COLUMNS if column not in fieldnames]
    if missing:
        raise ValueError(f'Manifest missing columns: {", ".join(missing)}')

    return rows


def assign_split(
    row: dict[str, str],
    train_ratio: float,
    val_ratio: float,
    rng: random.Random,
) -> str:
    explicit = (row.get('split') or '').strip().lower()
    if explicit in {'train', 'val', 'test'}:
        return explicit

    roll = rng.random()
    if roll < train_ratio:
        return 'train'
    if roll < train_ratio + val_ratio:
        return 'val'
    return 'test'


def export_split(
    rows: list[dict[str, str]],
    split_name: str,
    output_dir: Path,
    service_root: Path,
) -> int:
    split_dir = output_dir / split_name
    images_dir = split_dir / 'images'
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_path = split_dir / 'labels.csv'

    exported = 0
    with labels_path.open('w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(['filename', 'words'])

        for row in rows:
            if row['split'] != split_name:
                continue

            transcription = (row.get('transcription') or '').strip()
            if not transcription:
                continue

            crop_path = Path(row['crop_path'])
            if not crop_path.is_absolute():
                crop_path = service_root / crop_path
            if not crop_path.exists():
                raise FileNotFoundError(f'Crop not found for {row["sample_id"]}: {crop_path}')

            target_name = f'{row["sample_id"]}{crop_path.suffix or ".png"}'
            target_path = images_dir / target_name
            shutil.copy2(crop_path, target_path)
            writer.writerow([target_name, transcription])
            exported += 1

    return exported


def main() -> None:
    args = parse_args()
    config_path = Path(args.config)
    if not config_path.exists():
        raise FileNotFoundError(f'Config not found: {config_path}')

    service_root = config_path.resolve().parent.parent.parent
    config = load_config(config_path)

    manifest_setting = Path(config['manifest'])
    manifest_path = manifest_setting if manifest_setting.is_absolute() else service_root / manifest_setting

    output_setting = Path(config.get('output_dir', 'runs/ocr/dataset'))
    output_dir = output_setting if output_setting.is_absolute() else service_root / output_setting

    rows = read_manifest(manifest_path)
    rng = random.Random(int(config.get('seed', 42)))
    train_ratio = float(config.get('train_ratio', 0.75))
    val_ratio = float(config.get('val_ratio', 0.15))

    for row in rows:
        row['split'] = assign_split(row, train_ratio, val_ratio, rng)

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    counts = {
        split: export_split(rows, split, output_dir, service_root)
        for split in ('train', 'val', 'test')
    }

    readme = output_dir / 'README.txt'
    languages = ', '.join(config.get('languages', ['en']))
    readme.write_text(
        '\n'.join(
            [
                'EasyOCR recognition dataset export (Task 132)',
                f'Languages: {languages}',
                f'Train images: {counts["train"]}',
                f'Val images: {counts["val"]}',
                f'Test images: {counts["test"]}',
                '',
                'Each split contains images/ and labels.csv (filename, words).',
                'Use the upstream EasyOCR trainer for full recognition fine-tuning.',
            ]
        ),
        encoding='utf-8',
    )

    print(f'Exported OCR dataset to {output_dir}')
    print(f'  train: {counts["train"]}  val: {counts["val"]}  test: {counts["test"]}')

    if not args.export_only:
        print('No built-in GPU trainer is bundled; use EasyOCR trainer with this export layout.')


if __name__ == '__main__':
    main()
