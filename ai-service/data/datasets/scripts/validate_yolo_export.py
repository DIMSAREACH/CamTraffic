"""Task 138 — Validate exported YOLO label files."""

from __future__ import annotations

import argparse
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[3]
IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate YOLO export image/label pairs')
    parser.add_argument('--images-dir', required=True)
    parser.add_argument('--labels-dir', required=True)
    parser.add_argument('--classes-file', default='data/datasets/labels/yolo/classes.txt')
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


def main() -> None:
    args = parse_args()
    images_dir = resolve_existing_dir(args.images_dir)
    labels_dir = resolve_existing_dir(args.labels_dir)
    classes_file = resolve(args.classes_file)
    class_count = load_class_count(classes_file)

    if not images_dir.is_dir():
        raise FileNotFoundError(f'Images directory not found: {images_dir}')
    if not labels_dir.is_dir():
        raise FileNotFoundError(f'Labels directory not found: {labels_dir}')

    issues: list[str] = []
    image_stems = {
        path.stem
        for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    }
    label_files = [path for path in labels_dir.glob('*.txt') if path.is_file()]

    for label_path in label_files:
        if label_path.stem not in image_stems:
            issues.append(f'Missing image for label file: {label_path.name}')

        lines = [line.strip() for line in label_path.read_text(encoding='utf-8').splitlines() if line.strip()]
        if not lines:
            issues.append(f'Empty label file: {label_path.name}')
            continue

        for index, line in enumerate(lines, start=1):
            parts = line.split()
            if len(parts) != 5:
                issues.append(f'{label_path.name}:{index} invalid field count')
                continue

            class_id = int(parts[0])
            if class_id < 0 or class_id >= class_count:
                issues.append(f'{label_path.name}:{index} class_id out of range: {class_id}')

            coords = [float(value) for value in parts[1:]]
            if any(value < 0.0 or value > 1.0 for value in coords):
                issues.append(f'{label_path.name}:{index} coordinate out of [0,1] range')

    for stem in sorted(image_stems):
        if not (labels_dir / f'{stem}.txt').exists():
            issues.append(f'Missing label for image stem: {stem}')

    if issues:
        print('YOLO export validation FAILED:')
        for issue in issues:
            print(f'- {issue}')
        raise SystemExit(1)

    print(
        f'YOLO export validation PASSED: {len(image_stems)} image(s), '
        f'{len(label_files)} label file(s), {class_count} class(es).'
    )


if __name__ == '__main__':
    main()
