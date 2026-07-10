"""Task 132 — Extract license plate crops from YOLO annotations."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2

SERVICE_ROOT = Path(__file__).resolve().parents[2]


PLATE_CLASS_IDS = {14, 15, 16}
CLASS_NAMES = {
    14: 'license_plate_kh_private',
    15: 'license_plate_kh_commercial',
    16: 'license_plate_kh_government',
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Generate OCR plate crops from YOLO labels')
    parser.add_argument('--images-dir', required=True, help='Directory with source images')
    parser.add_argument('--labels-dir', required=True, help='Directory with YOLO .txt labels')
    parser.add_argument(
        '--output-dir',
        default='data/datasets/processed/ocr/crops',
        help='Directory for exported plate crops',
    )
    parser.add_argument(
        '--manifest',
        default='data/datasets/manifests/ocr_manifest.csv',
        help='OCR manifest CSV to append or create',
    )
    parser.add_argument('--split', default='train', choices=['train', 'val', 'test'])
    parser.add_argument('--padding', type=float, default=0.05, help='BBox padding ratio')
    parser.add_argument(
        '--class-ids',
        default='14,15,16',
        help='Comma-separated YOLO class IDs treated as plates',
    )
    return parser.parse_args()


def yolo_to_pixels(
    class_id: int,
    x_center: float,
    y_center: float,
    width: float,
    height: float,
    image_width: int,
    image_height: int,
) -> tuple[int, int, int, int, int]:
    box_w = width * image_width
    box_h = height * image_height
    x1 = int((x_center * image_width) - (box_w / 2))
    y1 = int((y_center * image_height) - (box_h / 2))
    x2 = int((x_center * image_width) + (box_w / 2))
    y2 = int((y_center * image_height) + (box_h / 2))
    return class_id, max(0, x1), max(0, y1), min(image_width, x2), min(image_height, y2)


def load_existing_ids(manifest_path: Path) -> set[str]:
    if not manifest_path.exists():
        return set()
    with manifest_path.open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        return {row['sample_id'] for row in reader if row.get('sample_id')}


def resolve_existing_dir(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path

    candidates = [Path.cwd() / path, SERVICE_ROOT / path]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


def resolve_output_path(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path
    return SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    images_dir = resolve_existing_dir(args.images_dir)
    labels_dir = resolve_existing_dir(args.labels_dir)
    output_dir = resolve_output_path(args.output_dir)
    manifest_path = resolve_output_path(args.manifest)
    class_ids = {int(value.strip()) for value in args.class_ids.split(',') if value.strip()}

    if not images_dir.is_dir():
        raise FileNotFoundError(
            f'Images directory not found: {images_dir}. '
            f'Try ai-service relative paths like "data/datasets/splits/train/images".'
        )
    if not labels_dir.is_dir():
        raise FileNotFoundError(
            f'Labels directory not found: {labels_dir}. '
            f'Try ai-service relative paths like "data/datasets/splits/train/labels".'
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    existing_ids = load_existing_ids(manifest_path)
    write_header = not manifest_path.exists()
    next_index = len(existing_ids) + 1
    created = 0

    fieldnames = [
        'sample_id',
        'crop_path',
        'transcription',
        'plate_type',
        'split',
        'source_image',
        'notes',
    ]

    with manifest_path.open('a', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()

        for label_path in sorted(labels_dir.glob('*.txt')):
            image_path = images_dir / f'{label_path.stem}.jpg'
            if not image_path.exists():
                image_path = images_dir / f'{label_path.stem}.png'
            if not image_path.exists():
                continue

            image = cv2.imread(str(image_path))
            if image is None:
                continue

            image_height, image_width = image.shape[:2]
            lines = label_path.read_text(encoding='utf-8').strip().splitlines()

            for line in lines:
                parts = line.split()
                if len(parts) != 5:
                    continue

                class_id = int(parts[0])
                if class_id not in class_ids:
                    continue

                _, x1, y1, x2, y2 = yolo_to_pixels(
                    class_id,
                    float(parts[1]),
                    float(parts[2]),
                    float(parts[3]),
                    float(parts[4]),
                    image_width,
                    image_height,
                )

                pad_x = int((x2 - x1) * args.padding)
                pad_y = int((y2 - y1) * args.padding)
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(image_width, x2 + pad_x)
                y2 = min(image_height, y2 + pad_y)

                if x2 <= x1 or y2 <= y1:
                    continue

                sample_id = f'ocr_{next_index:06d}'
                while sample_id in existing_ids:
                    next_index += 1
                    sample_id = f'ocr_{next_index:06d}'

                crop_path = output_dir / f'{sample_id}.png'
                cv2.imwrite(str(crop_path), image[y1:y2, x1:x2])

                writer.writerow(
                    {
                        'sample_id': sample_id,
                        'crop_path': crop_path.as_posix(),
                        'transcription': '',
                        'plate_type': CLASS_NAMES.get(class_id, 'license_plate_kh_private'),
                        'split': args.split,
                        'source_image': image_path.as_posix(),
                        'notes': 'auto-generated crop — add transcription',
                    }
                )
                existing_ids.add(sample_id)
                next_index += 1
                created += 1

    print(f'Wrote {created} plate crop(s) to {output_dir}')
    print(f'Manifest updated: {manifest_path}')


if __name__ == '__main__':
    main()
