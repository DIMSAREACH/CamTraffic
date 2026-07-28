#!/usr/bin/env python
"""
Build YOLO train/val/test splits for every folder under Road signs in Cambodia.

Usage (from repo root):
  python ai/scripts/complete_reference_sign_splits.py
  python ai/scripts/complete_reference_sign_splits.py --only "6-Mandatory signs"
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, REPORTS_DIR  # noqa: E402
from dim_sareach_paths import road_signs_root  # noqa: E402
from reference_sign_split import SIGN_CATEGORY_SPLITS, build_category_split  # noqa: E402

STEM_MAP_PATH = AI_ROOT / 'cambodia_stem_to_class.json'


def main() -> int:
    parser = argparse.ArgumentParser(description='Build all reference sign category YOLO splits')
    parser.add_argument('--root', type=Path, default=None, help='Road signs in Cambodia folder')
    parser.add_argument('--only', action='append', default=[], help='Folder name(s) to process')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    root = (args.root or road_signs_root()).resolve()
    if not root.is_dir():
        raise SystemExit(f'Road signs root not found: {root}')
    if not STEM_MAP_PATH.is_file():
        raise SystemExit(f'Run ingest first: python ai/ingest_cambodia_reference.py\nMissing {STEM_MAP_PATH}')

    targets = args.only or sorted(SIGN_CATEGORY_SPLITS.keys())
    summary: list[dict] = []
    for folder_name in targets:
        output_name = SIGN_CATEGORY_SPLITS.get(folder_name)
        if not output_name:
            print(f'Skip unknown folder: {folder_name}')
            continue
        source = root / folder_name
        if not source.is_dir():
            print(f'Skip missing: {source}')
            continue
        report = build_category_split(source, output_name, STEM_MAP_PATH, seed=args.seed)
        summary.append({
            'folder': folder_name,
            'output': output_name,
            'images': report['images_total'],
            'nc': report['nc'],
            'split': report['split'],
        })
        print(f'{folder_name}: {report["images_total"]} img, nc={report["nc"]} -> {output_name}')

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f'complete_reference_signs_{stamp}.json'
    out.write_text(json.dumps({'root': str(root), 'categories': summary}, indent=2), encoding='utf-8')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
