#!/usr/bin/env python
"""
Remove or report duplicate images using SHA-256 content hashes.

Usage (from repo root):
  python ai/scripts/dedup_images.py --dataset ai/dataset --dry-run
  python ai/scripts/dedup_images.py --dataset ai/dataset_10 --apply
  python ai/scripts/dedup_images.py --path ai/datasets/raw/license_plates --apply
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DATASETS_ROOT, IMAGE_EXTS, REPORTS_DIR, iter_images, sha256_file


def collect_images(root: Path) -> list[Path]:
    paired = iter_images(root)
    if paired:
        return [p for _split, p in paired]
    if not root.is_dir():
        return []
    return sorted(
        p for p in root.rglob('*')
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def main() -> int:
    parser = argparse.ArgumentParser(description='SHA-256 duplicate detection for dataset images')
    parser.add_argument('--dataset', type=Path, default=None)
    parser.add_argument('--path', type=Path, default=None, help='Any image folder (e.g. raw/license_plates)')
    parser.add_argument('--apply', action='store_true', help='Delete duplicate files (keep first per hash)')
    parser.add_argument('--dry-run', action='store_true', help='Report only (default unless --apply)')
    args = parser.parse_args()

    target = args.path or args.dataset or (AI_ROOT / 'dataset')
    dataset = target.resolve()
    if not dataset.is_dir():
        raise SystemExit(f'Dataset not found: {dataset}')

    groups: dict[str, list[Path]] = defaultdict(list)
    for path in collect_images(dataset):
        groups[sha256_file(path)].append(path)

    dup_groups = {h: paths for h, paths in groups.items() if len(paths) > 1}
    removed = 0
    for paths in dup_groups.values():
        keep, *dupes = sorted(paths, key=lambda p: str(p))
        for dup in dupes:
            label = dup.with_suffix('.txt')
            if args.apply:
                dup.unlink(missing_ok=True)
                if label.is_file():
                    label.unlink(missing_ok=True)
                removed += 1
            else:
                print(f'[dup] {dup.name} (keep {keep.name})')

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    report = {
        'dataset': str(dataset),
        'duplicate_groups': len(dup_groups),
        'duplicate_files': sum(len(v) - 1 for v in dup_groups.values()),
        'removed': removed if args.apply else 0,
        'mode': 'apply' if args.apply else 'dry-run',
    }
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'dedup_report_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Dataset: {dataset}')
    print(f'Duplicate groups: {report["duplicate_groups"]}')
    print(f'Duplicate files: {report["duplicate_files"]}')
    if args.apply:
        print(f'Removed: {removed}')
    else:
        print('Dry run — pass --apply to delete duplicates')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
