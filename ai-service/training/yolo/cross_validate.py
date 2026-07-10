"""Task 257 — Cross-Validation: evaluate best.pt on the held-out test split.

Loads the trained weights, runs YOLO validation on the test split (never seen
during training), and saves a JSON + Markdown report.

Usage:
    python training/yolo/cross_validate.py
    python training/yolo/cross_validate.py --weights runs/detect/camtraffic-v2/weights/best.pt
    python training/yolo/cross_validate.py --split val   # use val split instead
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='CamTraffic — Cross-Validation on test split')
    p.add_argument('--weights',
                   default='runs/detect/camtraffic-v2/weights/best.pt',
                   help='Path to trained .pt weights')
    p.add_argument('--data',   default='training/yolo/dataset.yaml')
    p.add_argument('--split',  default='test', choices=['train', 'val', 'test'],
                   help='Dataset split to evaluate on')
    p.add_argument('--imgsz',  type=int, default=640)
    p.add_argument('--batch',  type=int, default=8)
    p.add_argument('--device', default='cpu')
    p.add_argument('--output', default='runs/evaluation/cross_val_test_report.json')
    return p.parse_args()


def resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else SERVICE_ROOT / p


def main() -> None:
    args    = parse_args()
    weights = resolve(args.weights)
    data    = resolve(args.data)
    output  = resolve(args.output)

    if not weights.exists():
        print(f'Weights not found: {weights}')
        print('Run training/yolo/train_v2.py first.')
        _write_stub_report(output, args)
        return

    from ultralytics import YOLO

    print(f'\n{"="*60}')
    print(f'Cross-Validation — evaluating on split: {args.split}')
    print(f'Weights: {weights}')
    print(f'{"="*60}\n')

    model = YOLO(str(weights))
    t0 = time.perf_counter()
    metrics = model.val(
        data=str(data),
        split=args.split,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device if args.device != 'cpu' else 'cpu',
        verbose=True,
        plots=True,
    )
    elapsed = time.perf_counter() - t0

    overall = {
        'map50':     round(float(getattr(metrics.box, 'map50', 0)), 4),
        'map50_95':  round(float(getattr(metrics.box, 'map',   0)), 4),
        'precision': round(float(getattr(metrics.box, 'mp',    0)), 4),
        'recall':    round(float(getattr(metrics.box, 'mr',    0)), 4),
    }

    # Per-class mAP@50
    per_class: dict[str, float] = {}
    class_names = metrics.names if hasattr(metrics, 'names') else {}
    try:
        for idx, cls_id in enumerate(metrics.box.ap_class_index):
            name = class_names.get(int(cls_id), f'class_{cls_id}')
            per_class[name] = round(float(metrics.box.ap50[idx]), 4)
    except Exception:
        pass

    report = {
        'weights':       str(weights.relative_to(SERVICE_ROOT)),
        'split':         args.split,
        'device':        args.device,
        'imgsz':         args.imgsz,
        'elapsed_sec':   round(elapsed, 1),
        'overall':       overall,
        'per_class_ap50': per_class,
        'targets': {
            'map50_ge_060': overall['map50'] >= 0.60,
            'map50_ge_080': overall['map50'] >= 0.80,
        },
        'notes': (
            f'Cross-validation on {args.split} split (held-out during training). '
            f'CPU run — GPU results would be higher with more epochs.'
        ),
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding='utf-8')

    # Markdown summary
    md_path = output.with_suffix('.md')
    rows = sorted(per_class.items(), key=lambda x: -x[1])
    md = [
        f'# Cross-Validation Report — {args.split.upper()} split',
        '',
        f'| Metric | Value | Target |',
        f'|--------|------:|--------|',
        f'| mAP@50     | {overall["map50"]:.4f}    | ≥ 0.80 (GPU) |',
        f'| mAP@50-95  | {overall["map50_95"]:.4f} | —            |',
        f'| Precision  | {overall["precision"]:.4f} | —            |',
        f'| Recall     | {overall["recall"]:.4f}    | —            |',
        '',
        '## Per-Class mAP@50',
        '',
        '| Rank | Class | mAP@50 |',
        '|-----:|-------|-------:|',
    ]
    for rank, (cls, ap) in enumerate(rows, 1):
        md.append(f'| {rank} | {cls} | {ap:.4f} |')

    md += [
        '',
        f'> Evaluated on `{args.split}` split · Weights: `{weights.name}`',
    ]
    md_path.write_text('\n'.join(md), encoding='utf-8')

    print(f'\n{"="*60}')
    print(f'Cross-Validation ({args.split}) Results')
    print(f'  mAP@50:    {overall["map50"]:.4f}  ({("PASS ≥0.60" if overall["map50"] >= 0.60 else "below 0.60")})')
    print(f'  mAP@50-95: {overall["map50_95"]:.4f}')
    print(f'  Precision: {overall["precision"]:.4f}')
    print(f'  Recall:    {overall["recall"]:.4f}')
    print(f'\n  Report: {output}')
    print(f'{"="*60}')


def _write_stub_report(output: Path, args) -> None:
    """Write a placeholder report when weights are not yet available."""
    from apps.config import SERVICE_ROOT  # noqa: F401
    stub = {
        'weights': args.weights,
        'split':   args.split,
        'status':  'weights_not_found',
        'message': f'Weights not found at {args.weights}. Run train_v2.py first.',
        'overall': {'map50': None, 'map50_95': None, 'precision': None, 'recall': None},
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(stub, indent=2), encoding='utf-8')
    print(f'Stub report written: {output}')


if __name__ == '__main__':
    main()
