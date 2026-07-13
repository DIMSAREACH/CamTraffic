#!/usr/bin/env python
"""
Build CamTraffic combined YOLO/CVAT class maps (31 classes).

Usage:
  python ai/scripts/build_class_maps.py
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DATASETS_ROOT, MANIFESTS_DIR, load_yaml_names

LABELS_DIR = DATASETS_ROOT / 'labels'
YOLO_DIR = LABELS_DIR / 'yolo'
CVAT_DIR = LABELS_DIR / 'cvat'

# 31-class combined detection model (signs + vehicles + plates)
EXTRA_SIGNS = [
    'NO_STOPPING',
    'M_YIELD_GIVE_WAY',
    'M_PRIORITY_ROAD',
    'P_NO_OVERTAKING',
    'P_MAXIMUM_SPEED_LIMIT',
    'W_CROSSROAD',
    'HEIGHT_LIMIT',
    'M_SLOW_DOWN',
    'ROAD_CLOSED_ALL_VEHICLES',
]
VEHICLE_CLASSES = [
    'sedan', 'suv', 'pickup', 'motorcycle', 'scooter', 'bus', 'truck', 'van', 'taxi',
]
PLATE_CLASSES = ['plate_private', 'plate_commercial', 'plate_government']


def build_combined_classes() -> list[dict]:
    sign_names = load_yaml_names(AI_ROOT / 'dataset_10' / 'data.yaml')
    signs = [sign_names[i] for i in sorted(sign_names)]
    rows: list[dict] = []
    idx = 0
    for name in signs:
        rows.append({'id': idx, 'name': name, 'group': 'traffic_sign', 'source': 'dataset_10'})
        idx += 1
    for name in VEHICLE_CLASSES:
        rows.append({'id': idx, 'name': name, 'group': 'vehicle', 'source': 'roboflow_cambodia_traffic'})
        idx += 1
    for name in PLATE_CLASSES:
        rows.append({'id': idx, 'name': name, 'group': 'license_plate', 'source': 'plate_number_reference'})
        idx += 1
    for name in EXTRA_SIGNS:
        rows.append({'id': idx, 'name': name, 'group': 'traffic_sign', 'source': 'ai/dataset'})
        idx += 1
    if len(rows) != 31:
        raise RuntimeError(f'Expected 31 classes, got {len(rows)}')
    return rows


def build_prohibitory_map() -> list[dict]:
    names = load_yaml_names(AI_ROOT / 'data.yaml')
    proh = sorted(name for name in names.values() if name.startswith('P_'))
    return [
        {'yolo_class': name, 'cvat_label': name, 'category': 'prohibitory', 'index_in_full_yaml': k}
        for k, name in sorted(names.items())
        if name.startswith('P_')
    ]


def main() -> int:
    combined = build_combined_classes()
    name_to_id = {row['name']: row['id'] for row in combined}
    plate_folder_map = {
        'private': name_to_id['plate_private'],
        'commercial': name_to_id['plate_commercial'],
        'government': name_to_id['plate_government'],
    }

    YOLO_DIR.mkdir(parents=True, exist_ok=True)
    CVAT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)

    (YOLO_DIR / 'classes.txt').write_text(
        '\n'.join(row['name'] for row in combined) + '\n',
        encoding='utf-8',
    )
    class_map = {
        'version': 1,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'nc': len(combined),
        'names': {row['id']: row['name'] for row in combined},
        'groups': {
            'traffic_sign': [r['id'] for r in combined if r['group'] == 'traffic_sign'],
            'vehicle': [r['id'] for r in combined if r['group'] == 'vehicle'],
            'license_plate': [r['id'] for r in combined if r['group'] == 'license_plate'],
        },
        'plate_folder_to_class_id': plate_folder_map,
        'vehicle_class_ids': [name_to_id[v] for v in VEHICLE_CLASSES],
    }
    (YOLO_DIR / 'class-map.json').write_text(json.dumps(class_map, indent=2), encoding='utf-8')

    cvat_labels = {
        'labels': [
            {
                'name': row['name'],
                'attributes': [{'name': 'group', 'values': [row['group']]}],
            }
            for row in combined
        ],
    }
    (CVAT_DIR / 'project-labels.json').write_text(json.dumps(cvat_labels, indent=2), encoding='utf-8')

    proh_rows = build_prohibitory_map()
    proh_path = MANIFESTS_DIR / 'prohibitory_sign_class_map.csv'
    with proh_path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=['yolo_class', 'cvat_label', 'category', 'index_in_full_yaml'],
        )
        writer.writeheader()
        writer.writerows(proh_rows)

    print(f'Combined classes: {len(combined)}')
    print(f'YOLO classes: {YOLO_DIR / "classes.txt"}')
    print(f'Class map: {YOLO_DIR / "class-map.json"}')
    print(f'CVAT labels: {CVAT_DIR / "project-labels.json"}')
    print(f'Prohibitory map: {proh_path} ({len(proh_rows)} rows)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
