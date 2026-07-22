"""CVAT annotation hub — metadata, label packs, staging scripts."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

from django.conf import settings


def _repo_root() -> Path:
    return Path(settings.BASE_DIR).parent


def _ai_root() -> Path:
    return _repo_root() / 'ai'


def _read_json(path: Path) -> dict | list | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def get_cvat_labels() -> dict:
    path = _ai_root() / 'datasets' / 'labels' / 'cvat' / 'project-labels.json'
    data = _read_json(path)
    if not isinstance(data, dict):
        return {'labels': [], 'path': str(path.relative_to(_repo_root())).replace('\\', '/')}
    labels = data.get('labels') or []
    return {
        'path': str(path.relative_to(_repo_root())).replace('\\', '/'),
        'label_count': len(labels),
        'labels': labels[:50],
        'labels_truncated': len(labels) > 50,
    }


def get_cvat_batches() -> list[dict]:
    stats = _read_json(_ai_root() / 'datasets' / 'manifests' / 'annotation_stats.json') or {}
    exports = stats.get('exports') or {}
    batches = [
        {
            'id': 'BATCH-SIGNS-DATASET10',
            'name': 'Traffic signs (10-class production)',
            'images': stats.get('traffic_signs_labeled', {}).get('production_10_class', 123),
            'source': 'ai/dataset_10/',
            'status': 'qa',
            'cvat_pack': None,
        },
        {
            'id': 'BATCH-SIGNS-FULL',
            'name': 'Traffic signs (full 236-class)',
            'images': stats.get('traffic_signs_labeled', {}).get('full_236_class', 2840),
            'source': 'ai/dataset/',
            'status': 'spot_check',
            'cvat_pack': None,
        },
        {
            'id': 'BATCH-VEHICLES-PENDING',
            'name': 'Vehicles (urban seed)',
            'images': stats.get('vehicles_pending_cvat', 22),
            'source': 'ai/datasets/raw/vehicles/urban/',
            'status': 'pending',
            'cvat_pack': 'ai/datasets/annotations/cvat_tasks/BATCH-VEHICLES-PENDING/',
        },
        {
            'id': 'BATCH-PLATES-SEED',
            'name': 'License plates (seed crops)',
            'images': 50,
            'source': 'ai/datasets/raw/license_plates/',
            'status': 'refine',
            'cvat_pack': None,
        },
    ]
    for batch_id, meta in exports.items():
        for row in batches:
            if row['id'] == batch_id:
                row['exported_images'] = meta.get('images', 0)
    return batches


def get_cvat_workflow() -> dict:
    protocol = _ai_root() / 'datasets' / 'protocols' / 'cvat-annotation-workflow.md'
    steps = [
        {'step': 1, 'title': 'Create CVAT project', 'detail': 'CamTraffic Combined (detection)'},
        {'step': 2, 'title': 'Import labels', 'detail': 'Upload project-labels.json (31 classes)'},
        {'step': 3, 'title': 'Upload images', 'detail': 'From dataset pack or staged cvat_tasks folder'},
        {'step': 4, 'title': 'Annotate', 'detail': 'Tight bounding boxes; reject blur < 80'},
        {'step': 5, 'title': 'Export YOLO 1.1', 'detail': 'Save to ai/datasets/annotations/imports/<BATCH-ID>/'},
        {'step': 6, 'title': 'Validate & merge', 'detail': 'validate_yolo_export.py → split_dataset.py'},
    ]
    return {
        'cvat_url': 'https://app.cvat.ai/projects',
        'protocol_path': str(protocol.relative_to(_repo_root())).replace('\\', '/'),
        'protocol_exists': protocol.is_file(),
        'steps': steps,
    }


def get_cvat_hub() -> dict:
    return {
        'workflow': get_cvat_workflow(),
        'labels': get_cvat_labels(),
        'batches': get_cvat_batches(),
        'combined_model_classes': (
            _read_json(_ai_root() / 'datasets' / 'manifests' / 'annotation_stats.json') or {}
        ).get('combined_model_classes', 31),
    }


def stage_vehicle_cvat_pack() -> dict:
    script = _repo_root() / 'ai' / 'scripts' / 'prepare_vehicle_cvat_pack.py'
    if not script.is_file():
        return {'ok': False, 'error': 'prepare_vehicle_cvat_pack.py not found'}
    try:
        proc = subprocess.run(
            [sys.executable, str(script)],
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        out = (proc.stdout or '') + (proc.stderr or '')
        return {
            'ok': proc.returncode == 0,
            'exit_code': proc.returncode,
            'output': out.strip()[-4000:],
            'pack_path': 'ai/datasets/annotations/cvat_tasks/BATCH-VEHICLES-PENDING/',
        }
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': 'Staging timed out after 120s'}
    except OSError as exc:
        return {'ok': False, 'error': str(exc)}


def get_annotation_batch_log(limit: int = 20) -> list[dict]:
    path = _ai_root() / 'datasets' / 'annotations' / 'annotation_batch_log.csv'
    if not path.is_file():
        return []
    rows = []
    with path.open(encoding='utf-8', newline='') as fh:
        for row in csv.DictReader(fh):
            rows.append(row)
    return rows[-limit:]
