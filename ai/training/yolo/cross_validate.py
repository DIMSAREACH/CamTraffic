#!/usr/bin/env python
"""Cross-validate best.pt on held-out test split."""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import AI_ROOT, EVAL_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description='Cross-validation on test split')
    parser.add_argument('--weights', type=Path, default=WEIGHTS_DIR / 'best_v2.pt')
    parser.add_argument('--data', type=Path, default=TRAINING_YOLO / 'dataset_signs_10.yaml')
    parser.add_argument(
        '--split',
        default='val',
        help='Dataset split (dataset_10 has train/val only; use training_combined for test with 31-class weights)',
    )
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        weights = WEIGHTS_DIR / 'best.pt'
    data = abs_yaml(args.data.resolve())
    model = YOLO(str(weights))
    metrics = model.val(data=str(data), split=args.split, plots=True)

    report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'split': args.split,
        'map50': float(metrics.box.map50) if metrics.box.map50 is not None else None,
        'map50_95': float(metrics.box.map) if metrics.box.map is not None else None,
    }
    out = EVAL_ROOT / 'cross_validate_report.json'
    write_json(out, report)
    md = EVAL_ROOT / 'cross_validate_report.md'
    md.write_text(
        f"# Cross-validation report\n\n"
        f"- Weights: `{weights}`\n"
        f"- mAP@50: **{report['map50']:.4f}**\n"
        f"- mAP@50-95: **{report['map50_95']:.4f}**\n",
        encoding='utf-8',
    )
    print(f"Test mAP@50: {report['map50']}")
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
