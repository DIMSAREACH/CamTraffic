#!/usr/bin/env python
"""Add Khmer sign_name, description, guidance to all entries in sign_catalog.json."""
from __future__ import annotations

import json
from pathlib import Path

from khmer_speech import enrich_catalog_row

ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / 'sign_catalog.json'


def main():
    if not CATALOG.exists():
        raise SystemExit('Run build_dataset.py first to create sign_catalog.json')

    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    for row in catalog:
        enrich_catalog_row(row)
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Updated {len(catalog)} signs with Khmer speech fields in {CATALOG}')


if __name__ == '__main__':
    main()
