"""Task 270 — Model Comparison: v1 vs v2 (and future GPU runs).

Reads training reports from runs/yolo/*.json and produces:
  - runs/evaluation/model_comparison_report.json
  - runs/evaluation/model_comparison_table.md

Usage:
    python training/yolo/compare_models.py
    python training/yolo/compare_models.py --reports runs/yolo/camtraffic-v1_training_report.json runs/yolo/camtraffic-v2_training_report.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Compare CamTraffic YOLO model versions')
    p.add_argument('--reports', nargs='+',
                   default=['runs/yolo/camtraffic-v1_training_report.json',
                            'runs/yolo/camtraffic-v2_training_report.json'],
                   help='Training report JSON files to compare')
    p.add_argument('--output', default='runs/evaluation/model_comparison_report.json')
    return p.parse_args()


def resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else SERVICE_ROOT / p


def _load_report(path: Path) -> dict:
    if not path.exists():
        return {'error': f'Report not found: {path}'}
    with path.open(encoding='utf-8') as fh:
        return json.load(fh)


def _fmt(v) -> str:
    if v is None or v == 'n/a':
        return 'n/a'
    try:
        return f'{float(v):.4f}'
    except (TypeError, ValueError):
        return str(v)


def main() -> None:
    args   = parse_args()
    output = resolve(args.output)

    reports = []
    for rp in args.reports:
        path = resolve(rp)
        data = _load_report(path)
        if 'error' not in data:
            reports.append(data)
            print(f'Loaded: {path.name}')
        else:
            print(f'  ⚠ {data["error"]}')

    if not reports:
        print('No reports loaded — check paths.')
        return

    # Build comparison table
    rows = []
    for r in reports:
        m = r.get('final_metrics') or r.get('overall') or {}
        rows.append({
            'run_name':     r.get('run_name', r.get('weights', 'unknown')),
            'epochs':       r.get('epochs', '?'),
            'device':       r.get('device', 'cpu'),
            'map50':        m.get('map50'),
            'map50_95':     m.get('map50_95'),
            'precision':    m.get('precision'),
            'recall':       m.get('recall'),
            'elapsed_sec':  r.get('elapsed_sec', '?'),
            'notes':        r.get('notes', ''),
        })

    comparison = {
        'models': rows,
        'best_map50':     max((r['map50'] or 0 for r in rows), default=0),
        'best_run':       max(rows, key=lambda r: r['map50'] or 0).get('run_name', '?'),
        'improvement_v1_to_v2': None,
    }

    # Compute v1→v2 improvement if both present
    if len(rows) >= 2:
        try:
            v1 = next(r for r in rows if 'v1' in str(r['run_name']))
            v2 = next(r for r in rows if 'v2' in str(r['run_name']))
            delta = (v2['map50'] or 0) - (v1['map50'] or 0)
            comparison['improvement_v1_to_v2'] = round(delta, 4)
        except StopIteration:
            pass

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(comparison, indent=2), encoding='utf-8')

    # Markdown table
    md_path = output.with_suffix('.md')
    bar = '─' * 80
    md_lines = [
        '# Model Comparison — CamTraffic YOLO Versions',
        '',
        f'| Model | Epochs | Device | mAP@50 | mAP@50-95 | Precision | Recall | Time (s) |',
        f'|-------|-------:|--------|-------:|----------:|----------:|-------:|---------:|',
    ]
    for r in rows:
        md_lines.append(
            f'| {r["run_name"]} | {r["epochs"]} | {r["device"]} | '
            f'{_fmt(r["map50"])} | {_fmt(r["map50_95"])} | '
            f'{_fmt(r["precision"])} | {_fmt(r["recall"])} | {r["elapsed_sec"]} |'
        )

    if comparison['improvement_v1_to_v2'] is not None:
        delta = comparison['improvement_v1_to_v2']
        sign  = '+' if delta >= 0 else ''
        md_lines += [
            '',
            f'**mAP@50 improvement v1 → v2: {sign}{delta:.4f} ({sign}{delta*100:.1f}%)**',
        ]

    md_lines += [
        '',
        '## Notes',
        '',
        '- v1: 5-epoch bootstrap on CPU (baseline)',
        '- v2: 50-epoch CPU run with Cambodia-tuned augmentation + cosine LR',
        '- GPU target (100+ epochs): mAP@50 ≥ 0.80',
        '',
        '> Run `training/yolo/train_v2.py --epochs 100 --device 0` on a GPU server for production results.',
    ]

    md_path.write_text('\n'.join(md_lines), encoding='utf-8')

    # Console summary
    print(f'\n{"="*60}')
    print(f'  Model Comparison ({len(rows)} runs)')
    print(f'{"="*60}')
    print(f'  {"Model":<25} {"mAP@50":>8} {"Precision":>10} {"Recall":>8}')
    print(f'  {"-"*55}')
    for r in rows:
        print(f'  {str(r["run_name"]):<25} {_fmt(r["map50"]):>8} {_fmt(r["precision"]):>10} {_fmt(r["recall"]):>8}')

    if comparison['improvement_v1_to_v2'] is not None:
        delta = comparison['improvement_v1_to_v2']
        sign  = '+' if delta >= 0 else ''
        print(f'\n  v1 → v2 improvement: {sign}{delta:.4f} mAP@50')

    print(f'\n  Best run:  {comparison["best_run"]} (mAP@50 = {comparison["best_map50"]:.4f})')
    print(f'  JSON:      {output}')
    print(f'  Markdown:  {md_path}')
    print(f'{"="*60}')


if __name__ == '__main__':
    main()
