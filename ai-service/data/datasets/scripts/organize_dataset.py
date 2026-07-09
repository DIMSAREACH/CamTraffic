"""Task 136 — Organize dataset files (rename, dedupe, blur/corruption screening)."""

from __future__ import annotations

import argparse
import csv
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import cv2

SERVICE_ROOT = Path(__file__).resolve().parents[3]
IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Organize dataset media for CamTraffic')
    parser.add_argument('--input-dir', required=True, help='Source directory (usually under raw/)')
    parser.add_argument('--output-dir', required=True, help='Destination directory (usually under processed/)')
    parser.add_argument('--prefix', required=True, help='Class prefix for renamed files (e.g. STOP, CAR)')
    parser.add_argument('--blur-threshold', type=float, default=80.0, help='Minimum Laplacian variance')
    parser.add_argument('--log', default='data/datasets/manifests/dataset_organization_log.csv')
    parser.add_argument('--dry-run', action='store_true', help='Analyze only; do not copy/rename')
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def blur_score(path: Path) -> float:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        return 0.0
    return float(cv2.Laplacian(image, cv2.CV_64F).var())


def is_corrupted(path: Path) -> bool:
    if path.stat().st_size == 0:
        return True
    image = cv2.imread(str(path))
    return image is None


def append_log(log_path: Path, row: dict[str, str]) -> None:
    write_header = not log_path.exists()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open('a', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=['timestamp', 'action', 'source_path', 'target_path', 'reason', 'operator', 'notes'],
        )
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def main() -> None:
    args = parse_args()
    input_dir = resolve(args.input_dir)
    output_dir = resolve(args.output_dir)
    log_path = resolve(args.log)

    if not input_dir.is_dir():
        raise FileNotFoundError(f'Input directory not found: {input_dir}')

    output_dir.mkdir(parents=True, exist_ok=True)
    seen_hashes: dict[str, Path] = {}
    next_index = 1
    accepted = 0
    rejected = 0

    for source in sorted(input_dir.rglob('*')):
        if not source.is_file() or source.suffix.lower() not in IMAGE_SUFFIXES:
            continue

        rel_source = source.relative_to(SERVICE_ROOT).as_posix()
        timestamp = datetime.now(timezone.utc).isoformat()

        if is_corrupted(source):
            rejected += 1
            append_log(
                log_path,
                {
                    'timestamp': timestamp,
                    'action': 'reject',
                    'source_path': rel_source,
                    'target_path': '',
                    'reason': 'corrupted_or_unreadable',
                    'operator': 'organize_dataset.py',
                    'notes': '',
                },
            )
            continue

        digest = file_hash(source)
        if digest in seen_hashes:
            rejected += 1
            append_log(
                log_path,
                {
                    'timestamp': timestamp,
                    'action': 'reject',
                    'source_path': rel_source,
                    'target_path': '',
                    'reason': 'duplicate_hash',
                    'operator': 'organize_dataset.py',
                    'notes': f'duplicate_of={seen_hashes[digest].name}',
                },
            )
            continue

        score = blur_score(source)
        if score < args.blur_threshold:
            rejected += 1
            append_log(
                log_path,
                {
                    'timestamp': timestamp,
                    'action': 'reject',
                    'source_path': rel_source,
                    'target_path': '',
                    'reason': 'blur_below_threshold',
                    'operator': 'organize_dataset.py',
                    'notes': f'blur_score={score:.2f}',
                },
            )
            continue

        target_name = f'{args.prefix}_{next_index:06d}{source.suffix.lower()}'
        target_path = output_dir / target_name
        while target_path.exists():
            next_index += 1
            target_name = f'{args.prefix}_{next_index:06d}{source.suffix.lower()}'
            target_path = output_dir / target_name

        if not args.dry_run:
            target_path.write_bytes(source.read_bytes())

        seen_hashes[digest] = target_path
        accepted += 1
        append_log(
            log_path,
            {
                'timestamp': timestamp,
                'action': 'rename',
                'source_path': rel_source,
                'target_path': target_path.relative_to(SERVICE_ROOT).as_posix(),
                'reason': 'accepted',
                'operator': 'organize_dataset.py',
                'notes': f'blur_score={score:.2f}',
            },
        )
        next_index += 1

    print(f'Accepted: {accepted}  Rejected: {rejected}')
    print(f'Output: {output_dir}')
    print(f'Log: {log_path}')
    if args.dry_run:
        print('Dry run only — no files copied.')


if __name__ == '__main__':
    main()
