#!/usr/bin/env python
"""Compare two YOLO training runs."""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _train_common import EVAL_ROOT, RUNS_ROOT, write_json


def last_map50(run_dir: Path) -> float | None:
    csv_path = run_dir / 'results.csv'
    if not csv_path.is_file():
        return None
    best = None
    with csv_path.open(encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            val = row.get('metrics/mAP50(B)', '').strip()
            if not val:
                continue
            f = float(val)
            best = f if best is None else max(best, f)
    return best


def main() -> int:
    parser = argparse.ArgumentParser(description='Compare YOLO model runs')
    parser.add_argument('--v1', type=Path, default=RUNS_ROOT / 'camtraffic-v1')
    parser.add_argument('--v2', type=Path, default=RUNS_ROOT / 'camtraffic-v2')
    args = parser.parse_args()

    m1 = last_map50(args.v1.resolve())
    m2 = last_map50(args.v2.resolve())
    delta = (m2 - m1) if m1 is not None and m2 is not None else None
    pct = (delta / m1 * 100) if delta is not None and m1 else None

    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'v1_run': str(args.v1),
        'v2_run': str(args.v2),
        'v1_map50': m1,
        'v2_map50': m2,
        'delta_map50': delta,
        'improvement_pct': pct,
    }
    out = EVAL_ROOT / 'model_comparison_report.json'
    write_json(out, report)
    print(f'v1 mAP@50: {m1}')
    print(f'v2 mAP@50: {m2}')
    if delta is not None:
        print(f'Improvement: {delta:+.4f} ({pct:+.1f}%)')
    print(f'Report: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
