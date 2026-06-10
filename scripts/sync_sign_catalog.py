#!/usr/bin/env python
"""Apply ai/sign_catalog.json changes to the database (Traffic Signs page + AI metadata)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
CAMBODIA_REFERENCE_ROOT = (
    ROOT.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'Road signs in Cambodia'
)
DEFAULT_SOURCES = (CAMBODIA_REFERENCE_ROOT,)


def main() -> None:
    catalog = ROOT / 'ai' / 'sign_catalog.json'
    if not catalog.is_file():
        raise SystemExit('Missing ai/sign_catalog.json')

    cmd = [
        sys.executable,
        str(BACKEND / 'manage.py'),
        'sync_ai_training',
        '--skip-env',
    ]
    for src in DEFAULT_SOURCES:
        if src.is_dir():
            cmd.append(f'--source-dir={src}')

    print('Syncing sign_catalog.json -> database...')
    subprocess.run(cmd, cwd=BACKEND, check=True)
    print('Done. Refresh the Traffic Signs page in the browser.')


if __name__ == '__main__':
    main()
