#!/usr/bin/env python
"""Import ai/traffic_sign_catalog_10.json into the TrafficSign database."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
CATALOG_PATH = ROOT / 'ai' / 'traffic_sign_catalog_10.json'


def main() -> None:
    if not CATALOG_PATH.is_file():
        raise SystemExit(
            'Missing ai/traffic_sign_catalog_10.json — run: python scripts/generate_traffic_sign_catalog_10.py'
        )

    payload = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    signs = payload.get('signs') if isinstance(payload, dict) else payload
    if not isinstance(signs, list) or not signs:
        raise SystemExit('traffic_sign_catalog_10.json has no signs')

    cmd = [
        sys.executable,
        str(BACKEND / 'manage.py'),
        'import_traffic_sign_catalog_10',
        f'--catalog={CATALOG_PATH}',
    ]
    print(f'Syncing {len(signs)} signs from traffic_sign_catalog_10.json -> database...')
    subprocess.run(cmd, cwd=BACKEND, check=True)

    img_cmd = [sys.executable, str(ROOT / 'scripts' / 'sync_catalog_10_reference_images.py')]
    print('Syncing reference sign images from Road signs in Cambodia...')
    subprocess.run(img_cmd, cwd=ROOT, check=True)
    print('Done. Refresh Traffic Signs / AI Detection in the browser.')


if __name__ == '__main__':
    main()
