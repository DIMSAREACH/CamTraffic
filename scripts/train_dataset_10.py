#!/usr/bin/env python
"""
Build, verify, and train YOLOv8n on the dataset_10 pilot pack (50 classes).

Usage (from repo root):
  python scripts/train_dataset_10.py
  python scripts/train_dataset_10.py --skip-train   # dataset + verify only
  python scripts/train_dataset_10.py --epochs 50 --device 0
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'
DATASET_ROOT = AI_ROOT / 'dataset_10'
DATA_YAML = DATASET_ROOT / 'data.yaml'
WEIGHTS_DIR = AI_ROOT / 'weights'
REPORT_DIR = ROOT / 'docs' / 'reports'
BUILD_SCRIPT = ROOT / 'scripts' / 'build_dataset_10.py'

TARGET_CLASSES = [
    'NO_ENTRY',
    'NO_LEFT_TURN',
    'NO_RIGHT_TURN',
    'NO_U_TURN',
    'NO_PARKING',
    'M_STOP',
    'P_SPEED_LIMIT_20_KM_H',
    'P_SPEED_LIMIT_50_KM_H',
    'W_PEDESTRIAN_CROSSING',
    'I_ONE_WAY_TRAFFIC',
    # +10 batch A
    'M_YIELD_GIVE_WAY',
    'M_PRIORITY_ROAD',
    'W_ROUNDABOUT_AHEAD',
    'M_KEEP_RIGHT',
    'P_NO_MOTORCYCLES',
    'P_NO_OVERTAKING',
    'W_SHARP_CURVE_TO_THE_LEFT',
    'W_END_ROAD_WORKS',
    'I_HOSPITAL',
    'I_BUILT_UP_AREA_BEGINS',
    # +10 batch B
    'NO_STOPPING',
    'P_NO_HONKING',
    'P_MAXIMUM_SPEED_LIMIT',
    'M_GO_STRAIGHT',
    'W_HUMP',
    'W_TRAFFIC_LIGHTS_AHEAD',
    'W_CATTLE_OR_DOMESTIC_ANIMALS',
    'W_NARROW_BRIDGE',
    'I_PARKING_LOT',
    'I_U_TURN',
    # +10 batch C
    'M_KEEP_LEFT',
    'M_TURN_LEFT',
    'M_TURN_RIGHT',
    'M_BICYCLES_ONLY',
    'I_EXPRESSWAY_BEGINS',
    'I_EXPRESSWAY_ENDS',
    'I_GAS_STATION',
    'I_BUILT_UP_AREA_ENDS',
    'M_PRIORITY_INTERSECTION',
    'M_SINGLE_TRACK_RAILWAY_CROSSING',
    # +10 batch D
    'I_AIRPORTS',
    'I_FERRY',
    'I_DEAD_END',
    'I_HOTEL_OR_MOTEL',
    'I_RESTAURANTS_SHOP',
    'I_TELEPHONE',
    'I_WEIGH_STATION',
    'I_PROVINCIAL_DISTRICT_OR_COMMUNE_BOUNDARY',
    'I_BEWARE_OF_TRAINS',
    'W_HANDICAPPED_CROSSING',
]

SIGN_CODES = [
    'PROH-001',
    'PROH-002',
    'PROH-003',
    'PROH-004',
    'PROH-005',
    'MAN-001',
    'SPD-020',
    'SPD-050',
    'WARN-001',
    'INFO-001',
    'MAN-002',
    'MAN-003',
    'WARN-002',
    'MAN-004',
    'PROH-006',
    'PROH-007',
    'WARN-003',
    'WARN-004',
    'INFO-002',
    'INFO-003',
    'PROH-008',
    'PROH-009',
    'SPD-MAX',
    'MAN-005',
    'WARN-005',
    'WARN-006',
    'WARN-007',
    'WARN-008',
    'INFO-004',
    'INFO-005',
    'MAN-006',
    'MAN-007',
    'MAN-008',
    'MAN-009',
    'INFO-006',
    'INFO-007',
    'INFO-008',
    'INFO-009',
    'MAN-010',
    'RAIL-001',
    'INFO-010',
    'INFO-011',
    'INFO-012',
    'INFO-013',
    'INFO-014',
    'INFO-015',
    'INFO-016',
    'INFO-017',
    'INFO-018',
    'WARN-009',
]


def load_yaml_names(yaml_path: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'\s*(\d+):\s*(\S+)', line)
        if m:
            names[int(m.group(1))] = m.group(2)
    return names


def class_from_stem(stem: str, class_names: list[str]) -> str | None:
    for name in sorted(class_names, key=len, reverse=True):
        if stem == name or stem.startswith(f'{name}_'):
            return name
    return None


def verify_dataset(dataset_root: Path, yaml_path: Path) -> tuple[int, list[str]]:
    names = load_yaml_names(yaml_path)
    class_names = list(names.values())
    errors: list[str] = []

    for split in ('train', 'val'):
        images_dir = dataset_root / 'images' / split
        labels_dir = dataset_root / 'labels' / split
        if not images_dir.is_dir():
            errors.append(f'missing images/{split}')
            continue
        for label_path in sorted(labels_dir.glob('*.txt')):
            img = None
            for ext in ('.jpg', '.jpeg', '.png'):
                candidate = images_dir / f'{label_path.stem}{ext}'
                if candidate.is_file():
                    img = candidate
                    break
            if img is None:
                errors.append(f'{split}/{label_path.name}: image missing')
                continue
            lines = [ln.strip() for ln in label_path.read_text(encoding='utf-8').splitlines() if ln.strip()]
            if not lines:
                errors.append(f'{split}/{label_path.name}: empty label')
                continue
            ids = {int(ln.split()[0]) for ln in lines}
            if len(ids) != 1:
                errors.append(f'{split}/{label_path.name}: multiple classes {ids}')
                continue
            cls_id = next(iter(ids))
            if cls_id not in names:
                errors.append(f'{split}/{label_path.name}: unknown class id {cls_id}')
                continue
            stem_class = class_from_stem(label_path.stem, class_names)
            if stem_class and names[cls_id] != stem_class:
                errors.append(
                    f'{split}/{label_path.name}: label {names[cls_id]} != filename {stem_class}',
                )

    return len(errors), errors


def build_dataset() -> None:
    print('Building dataset_10...')
    subprocess.run([sys.executable, str(BUILD_SCRIPT)], cwd=ROOT, check=True)


def train_yolo(
    *,
    epochs: int,
    batch: int,
    imgsz: int,
    device: str,
    model: str,
    project: Path,
    name: str,
) -> Path:
    from ultralytics import YOLO

    data_path = DATA_YAML.resolve().as_posix()
    text = DATA_YAML.read_text(encoding='utf-8')
    if 'path:' in text:
        lines = []
        for line in text.splitlines():
            if line.startswith('path:'):
                lines.append(f'path: {DATASET_ROOT.resolve().as_posix()}')
            else:
                lines.append(line)
        DATA_YAML.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f'Training YOLOv8 on {DATA_YAML} ({epochs} epochs, device={device})...')
    yolo = YOLO(model)
    yolo.train(
        data=str(DATA_YAML),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project=str(project),
        name=name,
        exist_ok=True,
        pretrained=True,
        verbose=True,
    )
    run_dir = project / name
    best = run_dir / 'weights' / 'best.pt'
    if not best.is_file():
        raise FileNotFoundError(f'Training finished but missing {best}')
    return run_dir


def read_final_metrics(run_dir: Path) -> dict:
    results_csv = run_dir / 'results.csv'
    if not results_csv.is_file():
        return {}
    lines = results_csv.read_text(encoding='utf-8').strip().splitlines()
    if len(lines) < 2:
        return {}
    header = [h.strip() for h in lines[0].split(',')]
    last = [v.strip() for v in lines[-1].split(',')]
    row = dict(zip(header, last))

    def f(key: str) -> float:
        try:
            return float(row.get(key, 0) or 0)
        except ValueError:
            return 0.0

    epoch = int(float(row.get('epoch', 0) or 0))
    return {
        'epochs': epoch,
        'precision': round(f('metrics/precision(B)'), 4),
        'recall': round(f('metrics/recall(B)'), 4),
        'mAP50': round(f('metrics/mAP50(B)'), 4),
        'mAP50_95': round(f('metrics/mAP50-95(B)'), 4),
    }


def copy_artifacts(run_dir: Path) -> dict[str, Path]:
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    out: dict[str, Path] = {}

    best_src = run_dir / 'weights' / 'best.pt'
    best_dst = WEIGHTS_DIR / 'best.pt'
    shutil.copy2(best_src, best_dst)
    out['best.pt'] = best_dst

    for plot_name in ('confusion_matrix.png', 'results.png'):
        src = run_dir / plot_name
        if src.is_file():
            dst = WEIGHTS_DIR / plot_name
            shutil.copy2(src, dst)
            out[plot_name] = dst

    cm_norm = run_dir / 'confusion_matrix_normalized.png'
    if cm_norm.is_file():
        shutil.copy2(cm_norm, WEIGHTS_DIR / 'confusion_matrix_normalized.png')

    return out


def write_training_status(
    metrics: dict,
    *,
    run_dir: Path,
    dataset_images: int,
) -> Path:
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    status = {
        'trained_at': time.time(),
        'trained_at_iso': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'),
        'model': 'yolov8n',
        'dataset': 'dataset_10',
        'yolo_class_count': len(TARGET_CLASSES),
        'training_images': dataset_images,
        'sign_codes': SIGN_CODES,
        'class_keys': TARGET_CLASSES,
        'epochs': metrics.get('epochs', 0),
        'precision': metrics.get('precision', 0),
        'recall': metrics.get('recall', 0),
        'mAP50': metrics.get('mAP50', 0),
        'mAP50_95': metrics.get('mAP50_95', 0),
        'run_dir': str(run_dir.resolve()),
        'best_pt': str((WEIGHTS_DIR / 'best.pt').resolve()),
    }
    path = WEIGHTS_DIR / 'training_status.json'
    path.write_text(json.dumps(status, indent=2) + '\n', encoding='utf-8')
    return path


def count_images(dataset_root: Path) -> int:
    total = 0
    for split in ('train', 'val'):
        total += len(list((dataset_root / 'images' / split).glob('*')))
    return total


def write_training_report(metrics: dict, artifacts: dict[str, Path], verify_errors: list[str]) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    path = REPORT_DIR / f'TRAINING_50_CLASS_REPORT_{stamp}.md'
    lines = [
        '# YOLOv8 50-Class Pilot Training Report',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        '',
        '## Dataset',
        '',
        f'- Path: `{DATASET_ROOT}`',
        f'- Classes: {len(TARGET_CLASSES)}',
        f'- Images: {count_images(DATASET_ROOT)}',
        f'- Label verification errors: {len(verify_errors)}',
        '',
        '## Metrics (final epoch)',
        '',
        '| Metric | Value |',
        '|--------|-------|',
        f'| Epochs | {metrics.get("epochs", "—")} |',
        f'| Precision | {metrics.get("precision", "—")} |',
        f'| Recall | {metrics.get("recall", "—")} |',
        f'| mAP50 | {metrics.get("mAP50", "—")} |',
        f'| mAP50-95 | {metrics.get("mAP50_95", "—")} |',
        '',
        '## Artifacts',
        '',
    ]
    for name, p in artifacts.items():
        lines.append(f'- `{name}` → `{p}`')
    lines.append(f'- `training_status.json` → `{WEIGHTS_DIR / "training_status.json"}`')
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description='Build, verify, train dataset_10 pilot YOLO model')
    parser.add_argument('--skip-build', action='store_true')
    parser.add_argument('--skip-train', action='store_true')
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch', type=int, default=16)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--device', type=str, default='cpu')
    parser.add_argument('--model', type=str, default='yolov8n.pt')
    parser.add_argument('--project', type=Path, default=AI_ROOT / 'runs' / 'detect')
    parser.add_argument('--name', type=str, default='dataset_10_train')
    args = parser.parse_args()

    if not args.skip_build:
        build_dataset()

    if not DATA_YAML.is_file():
        raise SystemExit(f'Missing {DATA_YAML} — run build first')

    err_count, err_list = verify_dataset(DATASET_ROOT, DATA_YAML)
    print(f'Label verification: {err_count} error(s)')
    if err_list:
        for e in err_list[:20]:
            print(f'  - {e}')
        raise SystemExit('Dataset verification failed — fix labels before training')

    if args.skip_train:
        print('Skip train requested — dataset ready.')
        return

    run_dir = train_yolo(
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        model=args.model,
        project=args.project,
        name=args.name,
    )

    metrics = read_final_metrics(run_dir)
    artifacts = copy_artifacts(run_dir)
    status_path = write_training_status(
        metrics,
        run_dir=run_dir,
        dataset_images=count_images(DATASET_ROOT),
    )
    report_path = write_training_report(metrics, artifacts, err_list)

    print('\n=== Training complete ===')
    print(f'Precision: {metrics.get("precision")}')
    print(f'Recall:    {metrics.get("recall")}')
    print(f'mAP50:     {metrics.get("mAP50")}')
    print(f'mAP50-95:  {metrics.get("mAP50_95")}')
    print(f'best.pt:   {artifacts.get("best.pt")}')
    print(f'status:    {status_path}')
    print(f'report:    {report_path}')


if __name__ == '__main__':
    main()
