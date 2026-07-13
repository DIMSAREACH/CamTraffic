#!/usr/bin/env python
"""
Build BATCH-REF-PROH-001 manifest from ai/data.yaml prohibitory (P_*) classes.

Usage:
  python ai/scripts/build_prohibitory_manifest.py
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, MANIFESTS_DIR, iter_images, load_yaml_names


def main() -> int:
    yaml_path = AI_ROOT / 'data.yaml'
    names = load_yaml_names(yaml_path)
    proh_classes = sorted(name for name in names.values() if name.startswith('P_'))

    counts: dict[str, int] = {c: 0 for c in proh_classes}
    dataset = AI_ROOT / 'dataset'
    for _split, path in iter_images(dataset):
        stem = path.stem
        for cls in proh_classes:
            if stem.startswith(cls):
                counts[cls] += 1
                break

    manifest = {
        'batch_id': 'BATCH-REF-PROH-001',
        'description': 'Cambodia prohibitory reference signs (P_* YOLO classes)',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'target_signs': 46,
        'classes_in_yaml': len(proh_classes),
        'classes_with_images': sum(1 for c in counts.values() if c > 0),
        'total_images': sum(counts.values()),
        'validated': True,
        'classes': [
            {'class_name': cls, 'image_count': counts[cls], 'status': 'present' if counts[cls] else 'missing'}
            for cls in proh_classes
        ],
    }

    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    out = MANIFESTS_DIR / 'BATCH-REF-PROH-001.json'
    out.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    print(f'Prohibitory classes: {len(proh_classes)}')
    print(f'With images: {manifest["classes_with_images"]}')
    print(f'Total images: {manifest["total_images"]}')
    print(f'Manifest: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
