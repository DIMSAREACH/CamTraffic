#!/usr/bin/env python
"""
Prepare all Dim Sareach thesis assets under Reference/.../Dataset for CamTraffic training.

Steps (default order):
  1. ingest_cambodia_reference  — catalog + stem map from Road signs in Cambodia
  2. reference sign YOLO splits — 12 category folders → ai/datasets/splits/*_dim_sareach
  3. cam_tsr import             — Data/images + labels (street sign boxes)
  4. roboflow raw import        — vehicles + plates into ai/datasets/raw/
  5. roboflow labeled exports   — annotations/exports + remapped splits
  6. road footage copy          — VDO/*.mp4 → ai/datasets/raw/road_footage/urban/
  7. build_class_maps           — 31-class combined map
  8. collection_tracker         — counts report

Optional:
  --full-yolo-dataset  run ai/build_dataset.py (236-class augmented ai/dataset; slow)
  --vehicle-jpg-batch  run complete_vehicle/plate scripts if Vichicle Detect exists

Usage (from repo root):
  python ai/scripts/prepare_dim_sareach_datasets.py
  python ai/scripts/prepare_dim_sareach_datasets.py --skip-roboflow
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
AI_ROOT = REPO_ROOT / 'ai'
SCRIPTS = REPO_ROOT / 'ai' / 'scripts'

sys.path.insert(0, str(SCRIPTS))
from dim_sareach_paths import (  # noqa: E402
    dataset_root,
    road_footage_source_root,
    road_signs_root,
    vehicle_detect_root,
)


def run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print('\n>>', ' '.join(cmd))
    subprocess.run(cmd, cwd=cwd or REPO_ROOT, check=True)


def copy_road_footage() -> dict:
    src = road_footage_source_root()
    dest = AI_ROOT / 'datasets' / 'raw' / 'road_footage' / 'urban'
    dest.mkdir(parents=True, exist_ok=True)
    copied = 0
    if not src.is_dir():
        return {'source': str(src), 'copied': 0, 'skipped': 'source missing'}
    for video in sorted(src.glob('*')):
        if not video.is_file() or video.suffix.lower() not in {'.mp4', '.mov', '.mkv', '.avi'}:
            continue
        target = dest / video.name
        if target.is_file() and target.stat().st_size == video.stat().st_size:
            continue
        shutil.copy2(video, target)
        copied += 1
    return {'source': str(src), 'dest': str(dest), 'copied': copied}


def main() -> int:
    parser = argparse.ArgumentParser(description='Prepare Dim Sareach Dataset for CamTraffic')
    parser.add_argument('--dataset-root', type=Path, default=None)
    parser.add_argument('--skip-ingest', action='store_true')
    parser.add_argument('--skip-sign-splits', action='store_true')
    parser.add_argument('--skip-cam-tsr', action='store_true')
    parser.add_argument('--skip-roboflow', action='store_true')
    parser.add_argument('--skip-footage', action='store_true')
    parser.add_argument('--skip-class-maps', action='store_true')
    parser.add_argument('--full-yolo-dataset', action='store_true', help='Run ai/build_dataset.py (slow)')
    parser.add_argument('--vehicle-jpg-batch', action='store_true', help='Auto-label Vichicle Detect JPGs')
    args = parser.parse_args()

    ds = (args.dataset_root or dataset_root()).resolve()
    if not ds.is_dir():
        raise SystemExit(f'Dataset root not found: {ds}\nSet CAMTRAFFIC_DIM_SAREACH_DATASET or pass --dataset-root')

    import os
    os.environ['CAMTRAFFIC_DIM_SAREACH_DATASET'] = str(ds)

    print(f'Dim Sareach Dataset root: {ds}')
    print(f'Road signs: {road_signs_root()}')

    report: dict = {
        'dataset_root': str(ds),
        'started_at': datetime.now(timezone.utc).isoformat(),
        'steps': {},
    }

    py = sys.executable

    if not args.skip_ingest:
        run([py, str(AI_ROOT / 'ingest_cambodia_reference.py'), '--root', str(road_signs_root())])
        report['steps']['ingest'] = 'ok'

    if not args.skip_sign_splits:
        run([py, str(SCRIPTS / 'complete_reference_sign_splits.py'), '--root', str(road_signs_root())])
        report['steps']['sign_splits'] = 'ok'

    if args.full_yolo_dataset:
        run([py, str(AI_ROOT / 'build_dataset.py'), '--source', str(road_signs_root())])
        report['steps']['full_yolo_dataset'] = 'ok'

    if not args.skip_cam_tsr:
        run([py, str(SCRIPTS / 'import_cam_tsr_data.py')])
        report['steps']['cam_tsr'] = 'ok'

    if not args.skip_roboflow:
        run([
            py, str(SCRIPTS / 'import_roboflow_zip.py'),
            '--type', 'vehicles', '--batch', 'BATCH-ROBO-VEH-001',
        ])
        run([
            py, str(SCRIPTS / 'import_roboflow_zip.py'),
            '--type', 'plates', '--batch', 'BATCH-ROBO-PLATE-001',
        ])
        run([
            py, str(SCRIPTS / 'export_roboflow_annotations.py'),
            '--type', 'vehicles', '--batch', 'BATCH-ROBO-VEH-001',
        ])
        run([
            py, str(SCRIPTS / 'export_roboflow_annotations.py'),
            '--type', 'plates', '--batch', 'BATCH-ROBO-PLATE-001',
        ])
        run([
            py, str(SCRIPTS / 'split_dataset.py'),
            '--export', 'BATCH-ROBO-VEH-001',
            '--output', 'cambodia_vehicle_reference_remapped',
        ])
        run([
            py, str(SCRIPTS / 'split_dataset.py'),
            '--export', 'BATCH-ROBO-PLATE-001',
            '--output', 'plate_number_reference_remapped',
        ])
        report['steps']['roboflow'] = 'ok'

    if args.vehicle_jpg_batch:
        vd = vehicle_detect_root()
        if vd.is_dir():
            run([py, str(SCRIPTS / 'import_reference_vehicle_plate.py'), '--source', str(vd)])
            run([py, str(SCRIPTS / 'complete_vehicle_dataset.py')])
            run([py, str(SCRIPTS / 'complete_plate_number_dataset.py')])
            report['steps']['vehicle_jpg_batch'] = 'ok'
        else:
            report['steps']['vehicle_jpg_batch'] = f'skipped — not found: {vd}'

    if not args.skip_footage:
        report['steps']['road_footage'] = copy_road_footage()

    if not args.skip_class_maps:
        run([py, str(SCRIPTS / 'build_class_maps.py')])
        report['steps']['class_maps'] = 'ok'

    run([py, str(SCRIPTS / 'collection_tracker.py'), '--write-manifest'])
    report['steps']['collection_tracker'] = 'ok'
    report['finished_at'] = datetime.now(timezone.utc).isoformat()

    out = REPO_ROOT / 'docs' / 'reports' / f'prepare_dim_sareach_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\nDone. Summary: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
