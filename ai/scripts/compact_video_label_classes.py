#!/usr/bin/env python
"""Compact sparse sign class IDs (200+) into contiguous YOLO ids starting at 5."""
from __future__ import annotations

import json
from pathlib import Path

ROOTS = [
    Path(__file__).resolve().parents[1] / 'datasets' / 'samples' / 'riverside_video_labels',
    Path(__file__).resolve().parents[1] / 'datasets' / 'samples' / 'chaktomuk_video_labels',
]
VEHICLE = {'bus': 0, 'car': 1, 'motorcycle': 2, 'truck': 3, 'tuk_tuk': 4}


def main() -> int:
    for root in ROOTS:
        yolo_dir = root / 'labels_yolo'
        json_dir = root / 'labels_json'
        sign_names: dict[str, bool] = {}
        for jp in sorted(json_dir.glob('*.json')):
            doc = json.loads(jp.read_text(encoding='utf-8'))
            for ann in doc.get('annotations', []):
                if ann.get('kind') == 'sign':
                    sign_names[ann['class_key']] = True
        sign_list = sorted(sign_names.keys())
        sign_map = {k: 5 + i for i, k in enumerate(sign_list)}

        for jp in json_dir.glob('*.json'):
            doc = json.loads(jp.read_text(encoding='utf-8'))
            for ann in doc.get('annotations', []):
                if ann.get('kind') == 'vehicle':
                    ann['class_id'] = VEHICLE.get(ann.get('class_key'), 1)
                else:
                    ann['class_id'] = sign_map.get(ann.get('class_key'), 5)
            jp.write_text(json.dumps(doc, indent=2), encoding='utf-8')
            stem = jp.name.replace('_signs_vehicles.json', '')
            lines = []
            for ann in doc.get('annotations', []):
                y = ann['bbox_yolo']
                lines.append(
                    f"{ann['class_id']} {y['x_center']:.6f} {y['y_center']:.6f} "
                    f"{y['width']:.6f} {y['height']:.6f}"
                )
            (yolo_dir / f'{stem}.txt').write_text(
                '\n'.join(lines) + ('\n' if lines else ''), encoding='utf-8',
            )

        classes = ['bus', 'car', 'motorcycle', 'truck', 'tuk_tuk'] + sign_list
        (root / 'classes.txt').write_text('\n'.join(classes) + '\n', encoding='utf-8')
        for name in ('report.json', 'video_gt_manifest.json'):
            p = root / name
            if p.exists():
                m = json.loads(p.read_text(encoding='utf-8'))
                m['class_map'] = {'vehicles': VEHICLE, 'signs': sign_map}
                p.write_text(json.dumps(m, indent=2), encoding='utf-8')
        print(f'{root.name}: classes={len(classes)} signs={len(sign_list)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
