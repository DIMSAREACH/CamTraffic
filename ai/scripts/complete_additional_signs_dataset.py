#!/usr/bin/env python
"""
Complete Dim Sareach "2- Additional signs" into a YOLO train/val/test split.

Usage (from repo root):
  python ai/scripts/complete_additional_signs_dataset.py
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
from reference_sign_split import build_category_split  # noqa: E402

DEFAULT_SOURCE = road_signs_root() / '2- Additional signs'
STEM_MAP_PATH = AI_ROOT / 'cambodia_stem_to_class.json'
OUTPUT_NAME = 'cambodia_additional_signs_dim_sareach'


def main() -> int:
    parser = argparse.ArgumentParser(description='Complete Additional signs YOLO dataset')
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--stem-map', type=Path, default=STEM_MAP_PATH)
    parser.add_argument('--output', type=str, default=OUTPUT_NAME)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    source = args.source.resolve()
    stem_map_path = args.stem_map.resolve()
    if not source.is_dir():
        raise SystemExit(f'Source not found: {source}')
    if not stem_map_path.is_file():
        raise SystemExit(f'Stem map not found: {stem_map_path}')

    report = build_category_split(source, args.output, stem_map_path, seed=args.seed)
    report['notes'] = [
        'Catalog icons: one image per Additional-sign class',
        'BBox = content-aware (non-white / non-transparent), fallback 0.92 full-frame',
    ]
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    report_path = REPORTS_DIR / f'complete_additional_signs_{stamp}.json'
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Source: {source}')
    print(f'Images: {report["images_total"]}')
    print(f'Classes (nc): {report["nc"]}')
    print(f"Split: {report['split']}")
    print(f'Output: {report["output"]}')
    print(f'Report: {report_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
