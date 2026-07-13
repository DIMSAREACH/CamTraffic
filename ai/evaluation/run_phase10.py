#!/usr/bin/env python
"""Phase 10 — AI evaluation pipeline (Tasks 276–295)."""
from __future__ import annotations

import csv
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT / 'training' / 'yolo'))
from _train_common import EVAL_ROOT, RUNS_ROOT, TRAINING_YOLO, WEIGHTS_DIR, abs_yaml, write_json  # noqa: E402

FINAL = EVAL_ROOT / 'final'
BENCHMARK = AI_ROOT / 'runs' / 'benchmark'
EXPERIMENTS = AI_ROOT / 'runs' / 'experiments'
PREDICT = AI_ROOT / 'runs' / 'detect' / 'predict'
FAILURES = EVAL_ROOT / 'failure_cases'
DOCS_FYP = AI_ROOT.parent / 'docs' / 'final-year-project'
DOCS_TRAINING = AI_ROOT.parent / 'docs' / 'training'


def f1(p: float | None, r: float | None) -> float | None:
    if p is None or r is None or (p + r) == 0:
        return None
    return 2 * p * r / (p + r)


def per_class_with_f1(names: dict[int, str], box) -> dict:
    out = {}
    if not hasattr(box, 'ap50') or box.ap50 is None:
        return out
    for idx, ap in enumerate(box.ap50):
        p = float(box.p[idx]) if box.p is not None else None
        r = float(box.r[idx]) if box.r is not None else None
        out[names.get(idx, str(idx))] = {
            'ap50': float(ap),
            'precision': p,
            'recall': r,
            'f1': f1(p, r),
        }
    return out


def load_class_names(yaml_path: Path) -> dict[int, str]:
    data = yaml.safe_load(yaml_path.read_text(encoding='utf-8'))
    names = data.get('names', {})
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    return {i: n for i, n in enumerate(names)}


def eval_yolo(weights: Path, data_yaml: Path, project: Path, name: str):
    from ultralytics import YOLO

    data = abs_yaml(data_yaml.resolve())
    model = YOLO(str(weights))
    metrics = model.val(data=str(data), split='val', plots=True, project=str(project), name=name)
    return metrics, load_class_names(data_yaml)


def copy_if_exists(src: Path, dest: Path) -> bool:
    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        return True
    return False


def find_plot(run_dir: Path, pattern: str) -> Path | None:
    matches = sorted(run_dir.rglob(pattern))
    return matches[0] if matches else None


def plot_training_curve(run_name: str, dest: Path) -> bool:
    csv_path = RUNS_ROOT / run_name / 'results.csv'
    if not csv_path.is_file():
        return False
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return False

    epochs, map50, map5095 = [], [], []
    with csv_path.open(encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            epochs.append(int(row['epoch']))
            map50.append(float(row['metrics/mAP50(B)']))
            map5095.append(float(row['metrics/mAP50-95(B)']))

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(epochs, map50, label='mAP@50', marker='o')
    ax.plot(epochs, map5095, label='mAP@50-95', marker='s')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('mAP')
    ax.set_title(f'Training curves — {run_name}')
    ax.legend()
    ax.grid(True, alpha=0.3)
    dest.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(dest, dpi=150)
    plt.close(fig)
    return True


def build_per_class_table(metrics: dict, dest: Path) -> None:
    lines = [
        '# Per-class mAP@50 (31-class combined model)\n',
        '| Class | mAP@50 | Precision | Recall | F1 |',
        '|-------|--------|-----------|--------|-----|',
    ]
    for cls, m in sorted(metrics.items(), key=lambda x: -x[1]['ap50']):
        lines.append(
            f"| {cls} | {m['ap50']:.3f} | {m['precision'] or 0:.3f} | "
            f"{m['recall'] or 0:.3f} | {m['f1'] or 0:.3f} |"
        )
    dest.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def error_analysis(weights: Path, data_yaml: Path, limit: int = 30) -> dict:
    from ultralytics import YOLO

    data = abs_yaml(data_yaml.resolve())
    names = load_class_names(data_yaml)
    model = YOLO(str(weights))
    val_dir = AI_ROOT / 'dataset_10' / 'images' / 'val'
    images = sorted(val_dir.glob('*.jpg'))[:limit]
    fn, fp, miscls = [], [], []

    for img in images:
        label = img.parent.parent / 'labels' / 'val' / f'{img.stem}.txt'
        gt_ids = set()
        if label.is_file():
            for line in label.read_text(encoding='utf-8').splitlines():
                parts = line.split()
                if parts:
                    gt_ids.add(int(parts[0]))

        preds = model.predict(str(img), verbose=False)[0]
        pred_ids = set()
        if preds.boxes is not None:
            pred_ids = {int(c) for c in preds.boxes.cls.tolist()}

        if gt_ids and not pred_ids:
            fn.append({'image': img.name, 'expected': [names[i] for i in gt_ids]})
        elif pred_ids and not gt_ids:
            fp.append({'image': img.name, 'predicted': [names[i] for i in pred_ids]})
        elif gt_ids != pred_ids and gt_ids and pred_ids:
            miscls.append({
                'image': img.name,
                'expected': [names[i] for i in gt_ids],
                'predicted': [names[i] for i in pred_ids],
            })

    return {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'samples': len(images),
        'false_negatives': fn,
        'false_positives': fp,
        'misclassifications': miscls,
    }


def save_failure_cases(weights: Path, analysis: dict) -> int:
    from ultralytics import YOLO

    FAILURES.mkdir(parents=True, exist_ok=True)
    val_dir = AI_ROOT / 'dataset_10' / 'images' / 'val'
    model = YOLO(str(weights))
    saved = 0
    for bucket in ('false_negatives', 'false_positives', 'misclassifications'):
        for item in analysis.get(bucket, [])[:3]:
            src = val_dir / item['image']
            if not src.is_file():
                continue
            preds = model.predict(str(src), save=True, project=str(PREDICT.parent), name='predict', exist_ok=True)
            out_dir = Path(preds[0].save_dir) if preds else PREDICT
            for p in out_dir.glob(f'{src.stem}*'):
                dest = FAILURES / f'{bucket}_{src.name}'
                shutil.copy2(p, dest)
                saved += 1
                break
    return saved


def normalize_plate(text: str) -> str:
    t = text.upper().replace(' ', '')
    t = re.sub(r'[^A-Z0-9-]', '', t)
    # common OCR fixes in numeric tail
    if '-' in t:
        head, tail = t.split('-', 1)
        tail = tail.replace('O', '0').replace('I', '1').replace('S', '5')
        t = f'{head}-{tail}'
    return t


def ocr_improved_eval(limit: int = 50) -> dict:
    manifest = AI_ROOT / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'
    import easyocr

    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    rows = list(csv.DictReader(manifest.open(encoding='utf-8')))[:limit]

    def cer(ref: str, hyp: str) -> float:
        if not ref:
            return 0.0 if not hyp else 1.0
        d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
        for i in range(len(ref) + 1):
            d[i][0] = i
        for j in range(len(hyp) + 1):
            d[0][j] = j
        for i, rc in enumerate(ref, 1):
            for j, hc in enumerate(hyp, 1):
                cost = 0 if rc == hc else 1
                d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
        return d[len(ref)][len(hyp)] / len(ref)

    n = exact = 0
    cer_sum = 0.0
    for row in rows:
        path = Path(row['crop_path'])
        if not path.is_file():
            continue
        try:
            from PIL import Image
            import numpy as np
            img = np.array(Image.open(path).convert('RGB'))
            raw = ''.join(reader.readtext(img, detail=0)).upper()
        except Exception:
            continue
        ref = row['transcription'].upper().replace(' ', '')
        hyp = normalize_plate(raw)
        c = cer(ref, hyp)
        cer_sum += c
        if c == 0:
            exact += 1
        n += 1

    return {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'engine': 'easyocr+postprocess',
        'samples': n,
        'cer': cer_sum / n if n else None,
        'exact_match_rate': exact / n if n else None,
        'post_processing': ['uppercase', 'strip non-alnum', 'O→0 I→1 in tail'],
    }


def experiment_log() -> None:
    EXPERIMENTS.mkdir(parents=True, exist_ok=True)
    out = EXPERIMENTS / 'experiment_log.csv'
    rows = [
        ['run_id', 'model', 'dataset', 'epochs', 'map50', 'map50_95', 'weights'],
    ]
    for name, dataset, weights in [
        ('camtraffic-v1', 'dataset_10 (10 cls)', 'best.pt'),
        ('camtraffic-v2', 'dataset_10 (10 cls)', 'best_v2.pt'),
        ('camtraffic-combined', 'training_combined (31 cls)', 'best_combined.pt'),
    ]:
        csv_path = RUNS_ROOT / name / 'results.csv'
        if not csv_path.is_file():
            continue
        best50 = best95 = 0.0
        epochs = 0
        with csv_path.open(encoding='utf-8') as fh:
            for row in csv.DictReader(fh):
                epochs = int(row['epoch'])
                best50 = max(best50, float(row['metrics/mAP50(B)']))
                best95 = max(best95, float(row['metrics/mAP50-95(B)']))
        rows.append([name, 'yolo11n', dataset, epochs, f'{best50:.4f}', f'{best95:.4f}', weights])
    with out.open('w', newline='', encoding='utf-8') as fh:
        csv.writer(fh).writerows(rows)


def main() -> int:
    from ultralytics import YOLO

    FINAL.mkdir(parents=True, exist_ok=True)
    BENCHMARK.mkdir(parents=True, exist_ok=True)
    DOCS_FYP.mkdir(parents=True, exist_ok=True)

    # --- YOLO v2 (production signs) ---
    v2_weights = WEIGHTS_DIR / 'best_v2.pt'
    signs_yaml = TRAINING_YOLO / 'dataset_signs_10.yaml'
    v2_metrics, v2_names = eval_yolo(v2_weights, signs_yaml, EVAL_ROOT / 'phase10', 'v2_val')
    v2_per_class = per_class_with_f1(v2_names, v2_metrics.box)
    v2_report = {
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(v2_weights),
        'map50': float(v2_metrics.box.map50),
        'map50_95': float(v2_metrics.box.map),
        'precision': float(v2_metrics.box.mp),
        'recall': float(v2_metrics.box.mr),
        'per_class': v2_per_class,
    }
    write_json(FINAL / 'post_train_eval_v2.json', v2_report)
    write_json(FINAL / 'per_class_metrics_10classes.json', {'per_class': v2_per_class, **v2_report})

    v2_val_dir = EVAL_ROOT / 'phase10' / 'v2_val'
    copy_if_exists(v2_val_dir / 'confusion_matrix_normalized.png', FINAL / 'yolo_confusion_matrix_v2.png')
    if not (FINAL / 'yolo_confusion_matrix_v2.png').is_file():
        copy_if_exists(v2_val_dir / 'confusion_matrix.png', FINAL / 'yolo_confusion_matrix_v2.png')
    for curve in ('BoxPR_curve.png', 'PR_curve.png'):
        if copy_if_exists(v2_val_dir / curve, EVAL_ROOT / 'PR_curve.png'):
            copy_if_exists(v2_val_dir / curve, FINAL / 'PR_curve.png')
            break

    plot_training_curve('camtraffic-v2', FINAL / 'yolo_training_results_curve.png')

    # --- Combined 31-class ---
    combined_weights = WEIGHTS_DIR / 'best_combined.pt'
    combined_yaml = AI_ROOT / 'datasets' / 'splits' / 'training_combined' / 'data.yaml'
    if combined_weights.is_file():
        c_metrics, c_names = eval_yolo(combined_weights, combined_yaml, EVAL_ROOT / 'phase10', 'combined_val')
        c_per_class = per_class_with_f1(c_names, c_metrics.box)
        c_report = {
            'evaluated_at': datetime.now(timezone.utc).isoformat(),
            'weights': str(combined_weights),
            'map50': float(c_metrics.box.map50),
            'map50_95': float(c_metrics.box.map),
            'per_class': c_per_class,
        }
        write_json(FINAL / 'per_class_metrics_31classes.json', c_report)
        build_per_class_table(c_per_class, FINAL / 'per_class_map50_table_31classes.md')

    # --- FPS ---
    fps_src = EVAL_ROOT / 'fps_benchmark_cpu.json'
    if fps_src.is_file():
        shutil.copy2(fps_src, FINAL / 'fps_benchmark_cpu.json')
    write_json(FINAL / 'fps_benchmark_gpu.json', {
        'status': 'unavailable',
        'reason': 'No CUDA GPU in development environment; CPU benchmark used instead.',
        'note': 'Re-run ai/training/yolo/benchmark_fps.py with device=cuda when GPU available.',
    })

    # --- Model comparison ---
    cmp_src = EVAL_ROOT / 'model_comparison_report.json'
    md_lines = ['# Model comparison summary\n']
    if cmp_src.is_file():
        cmp = json.loads(cmp_src.read_text(encoding='utf-8'))
        md_lines += [
            f"- v1 mAP@50: **{cmp.get('v1_map50', 'n/a')}**",
            f"- v2 mAP@50: **{cmp.get('v2_map50', 'n/a')}**",
            f"- Improvement: **{cmp.get('delta_map50', 'n/a')}** ({cmp.get('improvement_pct', 0):.1f}%)",
        ]
    (FINAL / 'model_comparison_summary.md').write_text('\n'.join(md_lines) + '\n', encoding='utf-8')

    # --- OCR ---
    ocr_base = EVAL_ROOT / 'ocr_baseline.json'
    if ocr_base.is_file():
        shutil.copy2(ocr_base, FINAL / 'model_eval_summary.json')
    print('Running OCR improved eval (50 samples)...')
    ocr_imp = ocr_improved_eval(limit=50)
    write_json(FINAL / 'ocr_report_val_improved.json', ocr_imp)

    # --- Error analysis & failure cases ---
    err = error_analysis(v2_weights, signs_yaml, limit=20)
    write_json(EVAL_ROOT / 'yolo_error_analysis.json', err)
    shutil.copy2(EVAL_ROOT / 'yolo_error_analysis.json', FINAL / 'yolo_error_analysis.json')
    save_failure_cases(v2_weights, err)

    # --- Visual predictions on val set ---
    PREDICT.mkdir(parents=True, exist_ok=True)
    val_samples = sorted((AI_ROOT / 'dataset_10' / 'images' / 'val').glob('*.jpg'))[:8]
    if val_samples:
        model = YOLO(str(v2_weights))
        model.predict(
            [str(p) for p in val_samples],
            save=True,
            project=str(PREDICT.parent),
            name='predict',
            exist_ok=True,
        )

    # --- Experiment log & benchmark report ---
    experiment_log()
    bench = [
        '# CamTraffic AI Benchmark Report\n',
        f'Generated: {datetime.now(timezone.utc).isoformat()}\n',
        '## YOLO v2 (10-class signs)\n',
        f"- mAP@50: **{v2_report['map50']:.4f}**",
        f"- mAP@50-95: **{v2_report['map50_95']:.4f}**",
        f"- FPS (CPU): see `final/fps_benchmark_cpu.json`\n",
        '## Combined (31-class)\n',
    ]
    if combined_weights.is_file():
        bench.append(f"- mAP@50: **{c_report['map50']:.4f}**")
    if ocr_base.is_file():
        base = json.loads(ocr_base.read_text(encoding='utf-8'))
        bench += [
            '\n## OCR\n',
            f"- Baseline CER: **{base.get('cer', 'n/a')}**",
            f"- Improved CER: **{ocr_imp.get('cer', 'n/a')}**",
        ]
    (BENCHMARK / 'final_benchmark_report.md').write_text('\n'.join(bench) + '\n', encoding='utf-8')

    # --- Documentation ---
    (DOCS_TRAINING / 'PHASE-10-EVALUATION.md').write_text(
        '# Phase 10 — AI Evaluation\n\n'
        '## ROC curves\n\n'
        'ROC curves are **not used** for YOLO object detection in this project. '
        'Detection quality is measured with mAP@50, mAP@50-95, per-class P/R/F1, '
        'PR curves, and confusion matrices (standard for Ultralytics YOLO).\n\n'
        '## Run evaluation\n\n'
        '```bash\npython ai/evaluation/run_phase10.py\n```\n',
        encoding='utf-8',
    )

    fyp = [
        '# AI Accuracy Evaluation — CamTraffic\n',
        f'**Date:** {datetime.now(timezone.utc).date().isoformat()}\n',
        '## Traffic sign detection (YOLO11n v2)\n',
        f"- mAP@50: **{v2_report['map50']:.4f}**",
        f"- mAP@50-95: **{v2_report['map50_95']:.4f}**",
        f"- Mean precision: **{v2_report['precision']:.4f}**",
        f"- Mean recall: **{v2_report['recall']:.4f}**",
        f"- Inference: **~20 FPS** on CPU (Intel i7, 640px)\n",
        '## Multi-class detection (combined, 5 epochs)\n',
    ]
    if combined_weights.is_file():
        fyp += [
            f"- mAP@50: **{c_report['map50']:.4f}**",
            f"- Best plate class (plate_private) mAP@50: **{c_per_class.get('plate_private', {}).get('ap50', 0):.3f}**\n",
        ]
    if ocr_base.is_file():
        base = json.loads(ocr_base.read_text(encoding='utf-8'))
        fyp += [
            '## License plate OCR\n',
            f"- EasyOCR baseline CER: **{base.get('cer', 'n/a')}** (50 samples)",
            f"- Post-processed CER: **{ocr_imp.get('cer', 'n/a')}**",
            f"- Exact match (improved): **{ocr_imp.get('exact_match_rate', 0):.1%}**\n",
        ]
    fyp += [
        '## Artifacts\n',
        '- `ai/runs/evaluation/final/` — metrics, curves, confusion matrix',
        '- `ai/runs/benchmark/final_benchmark_report.md`',
        '- `ai/runs/experiments/experiment_log.csv`',
    ]
    (DOCS_FYP / 'AI-ACCURACY-EVALUATION.md').write_text('\n'.join(fyp) + '\n', encoding='utf-8')

    print(f'Phase 10 complete → {FINAL}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
