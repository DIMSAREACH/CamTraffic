#!/usr/bin/env python
"""
Export AI-06 thesis evidence: training metric plots + sample YOLO predictions.

Usage (from project root):
  python scripts/export_ai06_evidence.py

Output:
  docs/thesis_evidence/AI-06/
    README.md
    metrics_summary.json
    training/          — copied Ultralytics plots
    predictions/       — annotated val-set samples
"""
from __future__ import annotations

import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / 'ai'
WEIGHTS = AI / 'weights'
DATASET_VAL = AI / 'dataset' / 'images' / 'val'
OUT = ROOT / 'docs' / 'thesis_evidence' / 'AI-06'

TRAINING_PLOTS = (
    'results.png',
    'confusion_matrix.png',
    'confusion_matrix_normalized.png',
    'PR_curve.png',
    'F1_curve.png',
    'P_curve.png',
    'R_curve.png',
    'val_batch0_labels.jpg',
    'val_batch0_pred.jpg',
    'val_batch1_labels.jpg',
    'val_batch1_pred.jpg',
)


def _pick_run_dir() -> Path:
    candidates = sorted(
        [
            p for p in WEIGHTS.iterdir()
            if p.is_dir() and (p / 'results.csv').is_file() and (p / 'results.png').is_file()
        ],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise SystemExit('No training run folder found under ai/weights/ (expected camtraffic_signs/)')
    return candidates[0]


def _read_final_metrics(run_dir: Path) -> dict:
    path = run_dir / 'results.csv'
    with path.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f, skipinitialspace=True))
    if not rows:
        return {}
    last = {k.strip(): v for k, v in rows[-1].items() if k}

    def _f(key: str) -> float:
        return float(last.get(key, 0) or 0)

    return {
        'epoch': int(float(last.get('epoch', 0) or 0)),
        'precision': round(_f('metrics/precision(B)'), 4),
        'recall': round(_f('metrics/recall(B)'), 4),
        'mAP50': round(_f('metrics/mAP50(B)'), 4),
        'mAP50_95': round(_f('metrics/mAP50-95(B)'), 4),
        'train_images': len(list((AI / 'dataset' / 'images' / 'train').glob('*.jpg'))),
        'val_images': len(list((AI / 'dataset' / 'images' / 'val').glob('*.jpg'))),
        'classes': _class_count(),
    }


def _class_count() -> int:
    data_yaml = AI / 'data.yaml'
    if not data_yaml.is_file():
        return 0
    text = data_yaml.read_text(encoding='utf-8')
    for line in text.splitlines():
        if line.strip().startswith('nc:'):
            return int(line.split(':', 1)[1].strip())
    return 0


def _copy_training_plots(run_dir: Path, dest: Path) -> list[str]:
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for name in TRAINING_PLOTS:
        src = run_dir / name
        if src.is_file():
            shutil.copy2(src, dest / name)
            copied.append(name)
    return copied


def _export_predictions(model_path: Path, dest: Path) -> list[str]:
    import cv2
    from ultralytics import YOLO

    dest.mkdir(parents=True, exist_ok=True)
    images = sorted(DATASET_VAL.glob('*.jpg'))
    if not images:
        raise SystemExit(f'No validation images in {DATASET_VAL}')

    model = YOLO(str(model_path))
    saved = []
    for img in images:
        results = model.predict(
            source=str(img),
            conf=0.15,
            save=False,
            verbose=False,
        )
        out_name = f'{img.stem}_prediction.jpg'
        out_path = dest / out_name
        annotated = results[0].plot()
        cv2.imwrite(str(out_path), annotated)
        saved.append(out_name)
    return saved


def _write_readme(
    run_dir: Path,
    metrics: dict,
    plots: list[str],
    predictions: list[str],
) -> None:
    sign_codes = []
    status_path = WEIGHTS / 'training_status.json'
    if status_path.is_file():
        try:
            sign_codes = json.loads(status_path.read_text(encoding='utf-8')).get('sign_codes', [])
        except json.JSONDecodeError:
            pass

    lines = [
        '# AI-06 Training Evidence (CamTraffic)',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        '',
        '## Model',
        '',
        f'- Weights: `ai/weights/best.pt`',
        f'- Training run: `{run_dir.relative_to(ROOT).as_posix()}`',
        f'- Classes: **{metrics.get("classes", "?")}** Cambodia traffic signs',
        '',
        '## Final validation metrics (epoch {})'.format(metrics.get('epoch', '?')),
        '',
        '| Metric | Value |',
        '| ------ | ----- |',
        f'| Precision | {metrics.get("precision", "—")} |',
        f'| Recall | {metrics.get("recall", "—")} |',
        f'| mAP@0.5 | {metrics.get("mAP50", "—")} |',
        f'| mAP@0.5:0.95 | {metrics.get("mAP50_95", "—")} |',
        '',
        f'- Dataset: {metrics.get("train_images", "?")} train / {metrics.get("val_images", "?")} val images',
        '',
        '## Trained sign codes',
        '',
    ]
    if sign_codes:
        for code in sign_codes:
            lines.append(f'- `{code}`')
    else:
        lines.append('- (see `ai/weights/training_status.json`)')

    lines.extend([
        '',
        '## Files for thesis screenshots',
        '',
        '### Training plots (`training/`)',
        '',
    ])
    for name in plots:
        lines.append(f'- `training/{name}`')

    lines.extend([
        '',
        '### Sample predictions (`predictions/`)',
        '',
        'Annotated bounding boxes on held-out validation images.',
        '',
    ])
    for name in predictions:
        lines.append(f'- `predictions/{name}`')

    lines.extend([
        '',
        '## Suggested thesis captions',
        '',
        '- **results.png** — Training/validation loss and mAP curves over 30 epochs.',
        '- **confusion_matrix_normalized.png** — Per-class detection accuracy on validation set.',
        '- **val_batch0_pred.jpg** — YOLO validation batch with predicted boxes.',
        '- **predictions/** — Individual sign images with live model inference overlay.',
        '',
        '## Regenerate',
        '',
        '```bash',
        'python scripts/export_ai06_evidence.py',
        '```',
        '',
    ])
    (OUT / 'README.md').write_text('\n'.join(lines), encoding='utf-8')


def main() -> None:
    if not (WEIGHTS / 'best.pt').is_file():
        raise SystemExit('Missing ai/weights/best.pt — train the model first (AI-06.3).')

    run_dir = _pick_run_dir()
    metrics = _read_final_metrics(run_dir)

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    plots = _copy_training_plots(run_dir, OUT / 'training')
    print(f'Copied {len(plots)} training plot(s) from {run_dir.name}/')

    predictions = _export_predictions(WEIGHTS / 'best.pt', OUT / 'predictions')
    print(f'Saved {len(predictions)} prediction screenshot(s).')

    summary = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'run_dir': str(run_dir.relative_to(ROOT)),
        'model': 'ai/weights/best.pt',
        **metrics,
        'training_plots': plots,
        'prediction_images': predictions,
    }
    (OUT / 'metrics_summary.json').write_text(
        json.dumps(summary, indent=2),
        encoding='utf-8',
    )
    _write_readme(run_dir, metrics, plots, predictions)

    print(f'\nThesis evidence ready: {OUT.relative_to(ROOT)}/')
    print('  - README.md')
    print('  - training/  (loss & metric plots)')
    print('  - predictions/  (sample detections)')


if __name__ == '__main__':
    main()
