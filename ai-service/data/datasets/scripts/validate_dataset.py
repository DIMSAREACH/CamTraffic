"""Task 139 — Comprehensive dataset validation for YOLO exports."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2

SERVICE_ROOT = Path(__file__).resolve().parents[3]
IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate CamTraffic dataset quality')
    parser.add_argument('--images-dir', required=True)
    parser.add_argument('--labels-dir', required=True)
    parser.add_argument('--classes-file', default='data/datasets/labels/yolo/classes.txt')
    parser.add_argument('--report', default='data/datasets/manifests/dataset_validation_report.json')
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path
    return SERVICE_ROOT / path


def resolve_existing_dir(path_arg: str) -> Path:
    path = Path(path_arg)
    if path.is_absolute():
        return path

    candidates = [Path.cwd() / path, SERVICE_ROOT / path]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


def load_class_count(classes_file: Path) -> int:
    lines = [line.strip() for line in classes_file.read_text(encoding='utf-8').splitlines() if line.strip()]
    return len(lines)


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def is_corrupted_image(path: Path) -> bool:
    if path.stat().st_size == 0:
        return True
    image = cv2.imread(str(path))
    return image is None


def main() -> None:
    args = parse_args()
    images_dir = resolve_existing_dir(args.images_dir)
    labels_dir = resolve_existing_dir(args.labels_dir)
    classes_file = resolve(args.classes_file)
    report_path = resolve(args.report)
    class_count = load_class_count(classes_file)

    if not images_dir.is_dir():
        sample_images = SERVICE_ROOT / 'data/datasets/annotations/exports/BATCH-ANN-001/images'
        raise FileNotFoundError(
            f'Images directory not found: {images_dir}. '
            f'Export CVAT labels first, or smoke-test with: {sample_images}'
        )
    if not labels_dir.is_dir():
        sample_labels = SERVICE_ROOT / 'data/datasets/annotations/exports/BATCH-ANN-001/labels'
        raise FileNotFoundError(
            f'Labels directory not found: {labels_dir}. '
            f'Export CVAT labels first, or smoke-test with: {sample_labels}'
        )

    summary = {
        'missing_labels': 0,
        'wrong_labels': 0,
        'incorrect_boxes': 0,
        'duplicate_images': 0,
        'corrupted_images': 0,
        'empty_images': 0,
        'empty_labels': 0,
        'incorrect_classes': 0,
    }
    issues: list[dict[str, str]] = []

    image_paths = [path for path in images_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES]
    label_paths = [path for path in labels_dir.glob('*.txt') if path.is_file()]
    image_stems = {path.stem for path in image_paths}
    label_stems = {path.stem for path in label_paths}

    hash_to_path: dict[str, str] = {}
    for image_path in image_paths:
        rel_image = image_path.relative_to(SERVICE_ROOT).as_posix()

        if image_path.stat().st_size == 0:
            summary['empty_images'] += 1
            issues.append({'type': 'empty_images', 'path': rel_image, 'detail': 'zero-byte image'})

        if is_corrupted_image(image_path):
            summary['corrupted_images'] += 1
            issues.append({'type': 'corrupted_images', 'path': rel_image, 'detail': 'unreadable image'})

        digest = file_hash(image_path)
        if digest in hash_to_path:
            summary['duplicate_images'] += 1
            issues.append(
                {
                    'type': 'duplicate_images',
                    'path': rel_image,
                    'detail': f'duplicate_of={hash_to_path[digest]}',
                }
            )
        else:
            hash_to_path[digest] = rel_image

        if image_path.stem not in label_stems:
            summary['missing_labels'] += 1
            issues.append({'type': 'missing_labels', 'path': rel_image, 'detail': 'missing label file'})

    for label_path in label_paths:
        rel_label = label_path.relative_to(SERVICE_ROOT).as_posix()
        if label_path.stem not in image_stems:
            summary['missing_labels'] += 1
            issues.append({'type': 'missing_labels', 'path': rel_label, 'detail': 'orphan label without image'})

        lines = [line.strip() for line in label_path.read_text(encoding='utf-8').splitlines() if line.strip()]
        if not lines:
            summary['empty_labels'] += 1
            issues.append({'type': 'empty_labels', 'path': rel_label, 'detail': 'label file has no boxes'})
            continue

        for index, line in enumerate(lines, start=1):
            parts = line.split()
            if len(parts) != 5:
                summary['wrong_labels'] += 1
                issues.append(
                    {
                        'type': 'wrong_labels',
                        'path': rel_label,
                        'detail': f'line {index}: expected 5 fields, got {len(parts)}',
                    }
                )
                continue

            try:
                class_id = int(parts[0])
                x_center, y_center, width, height = [float(value) for value in parts[1:]]
            except ValueError:
                summary['wrong_labels'] += 1
                issues.append({'type': 'wrong_labels', 'path': rel_label, 'detail': f'line {index}: non-numeric values'})
                continue

            if class_id < 0 or class_id >= class_count:
                summary['incorrect_classes'] += 1
                issues.append(
                    {
                        'type': 'incorrect_classes',
                        'path': rel_label,
                        'detail': f'line {index}: class_id={class_id} outside [0,{class_count - 1}]',
                    }
                )

            coords = [x_center, y_center, width, height]
            if any(value < 0.0 or value > 1.0 for value in coords):
                summary['incorrect_boxes'] += 1
                issues.append(
                    {
                        'type': 'incorrect_boxes',
                        'path': rel_label,
                        'detail': f'line {index}: coordinate out of [0,1] range',
                    }
                )
            elif width <= 0.0 or height <= 0.0:
                summary['incorrect_boxes'] += 1
                issues.append(
                    {
                        'type': 'incorrect_boxes',
                        'path': rel_label,
                        'detail': f'line {index}: non-positive width/height',
                    }
                )

    status = 'passed' if sum(summary.values()) == 0 else 'failed'
    report = {
        'task': 139,
        'status': status,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'images_dir': images_dir.relative_to(SERVICE_ROOT).as_posix(),
        'labels_dir': labels_dir.relative_to(SERVICE_ROOT).as_posix(),
        'summary': summary,
        'issues': issues,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Dataset validation {status.upper()}: {report_path}')
    for key, value in summary.items():
        print(f'  {key}: {value}')

    if status == 'failed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
