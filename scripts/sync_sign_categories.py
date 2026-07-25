#!/usr/bin/env python
"""Apply reference_sign_meta categories onto sign_catalog.json + DB TrafficSign rows.

Use after fixing Dim Sareach folder→category mapping and re-running ingest:
  python ai/ingest_cambodia_reference.py
  python scripts/sync_sign_categories.py
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META_PATH = ROOT / 'ai' / 'reference_sign_meta.json'
CATALOG_PATH = ROOT / 'ai' / 'sign_catalog.json'
FRONTEND_CATALOG_PATHS = [
    ROOT / 'frontend-admin' / 'shared' / 'data' / 'sign_catalog.json',
    ROOT / 'frontend-user' / 'shared' / 'data' / 'sign_catalog.json',
]


def _load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sync_catalog(meta: dict[str, dict]) -> list[dict]:
    catalog: list[dict] = _load_json(CATALOG_PATH)
    by_code = {
        str(row.get('sign_code') or '').strip(): row
        for row in meta.values()
        if row.get('sign_code')
    }

    updated = 0
    for row in catalog:
        class_key = str(row.get('class_key') or '').strip()
        sign_code = str(row.get('sign_code') or '').strip()
        hit = meta.get(class_key) or by_code.get(sign_code)
        if not hit or not hit.get('category'):
            continue
        if row.get('category') != hit['category']:
            row['category'] = hit['category']
            updated += 1

    _write_json(CATALOG_PATH, catalog)
    for path in FRONTEND_CATALOG_PATHS:
        _write_json(path, catalog)
    print(f'Updated {updated} catalog rows → {CATALOG_PATH}')
    return catalog


def sync_database(catalog: list[dict]) -> None:
    backend = ROOT / 'backend'
    if str(backend) not in sys.path:
        sys.path.insert(0, str(backend))
    # Ensure backend/.env is loaded (USE_SQLITE / Postgres) the same way manage.py does.
    os.chdir(backend)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    try:
        import django
        django.setup()
        from traffic_signs.models import TrafficSign
    except Exception as exc:
        print(f'Skip DB sync: {exc}')
        return

    by_code = {str(r.get('sign_code') or '').strip(): r for r in catalog if r.get('sign_code')}
    by_key = {str(r.get('class_key') or '').strip(): r for r in catalog if r.get('class_key')}
    updated = 0
    for sign in TrafficSign.objects.all().iterator():
        hit = by_key.get(sign.sign_code) or by_code.get(sign.sign_code)
        if not hit:
            for row in catalog:
                if row.get('sign_code') == sign.sign_code or row.get('class_key') == sign.sign_code:
                    hit = row
                    break
        if not hit or not hit.get('category'):
            continue
        if sign.category != hit['category']:
            sign.category = hit['category']
            sign.save(update_fields=['category'])
            updated += 1

    counts = Counter(TrafficSign.objects.values_list('category', flat=True))
    print(f'Updated {updated} DB TrafficSign categories')
    print(f'DB category counts: {dict(counts)}')


def main() -> None:
    if not META_PATH.is_file():
        raise SystemExit(f'Missing {META_PATH} — run ai/ingest_cambodia_reference.py first')
    if not CATALOG_PATH.is_file():
        raise SystemExit(f'Missing {CATALOG_PATH}')

    meta = _load_json(META_PATH)
    meta_counts = Counter(row.get('category') or 'informative' for row in meta.values())
    print(f'Meta categories ({len(meta)}): {dict(meta_counts)}')

    catalog = sync_catalog(meta)
    catalog_counts = Counter(row.get('category') or 'informative' for row in catalog)
    print(f'Catalog categories ({len(catalog)}): {dict(catalog_counts)}')
    sync_database(catalog)


if __name__ == '__main__':
    main()
