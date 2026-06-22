"""
Sync all 236 Cambodia traffic signs with bilingual names, descriptions, guidance, and TTS labels.

Updates:
  - ai/sign_catalog.json
  - ai/sign_khmer_overrides.json (all sign codes)
  - ai/reference_sign_meta.json
  - frontend-*/shared/data/sign_khmer_overrides.json
  - SQLite/Postgres TrafficSign rows (when Django is available)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ai'))

from khmer_speech import (  # noqa: E402
    enrich_catalog_row,
    export_khmer_overrides,
    sync_reference_meta_from_catalog,
)

CATALOG_PATH = ROOT / 'ai' / 'sign_catalog.json'
META_PATH = ROOT / 'ai' / 'reference_sign_meta.json'
OVERRIDES_PATH = ROOT / 'ai' / 'sign_khmer_overrides.json'
FRONTEND_DATA_DIR = [
    ROOT / 'frontend-admin' / 'shared' / 'data',
    ROOT / 'frontend-user' / 'shared' / 'data',
]
FRONTEND_OVERRIDE_PATHS = [d / 'sign_khmer_overrides.json' for d in FRONTEND_DATA_DIR]
AI_JSON_FILES = [
    'sign_catalog.json',
    'reference_sign_meta.json',
    'sign_khmer_overrides.json',
    'cambodia_stem_to_class.json',
]


def sync_frontend_ai_json() -> list[Path]:
    """Mirror all ai/*.json into frontend-*/shared/data/."""
    written: list[Path] = []
    for name in AI_JSON_FILES:
        source = ROOT / 'ai' / name
        if not source.is_file():
            continue
        text = source.read_text(encoding='utf-8')
        for data_dir in FRONTEND_DATA_DIR:
            data_dir.mkdir(parents=True, exist_ok=True)
            target = data_dir / name
            target.write_text(text, encoding='utf-8')
            written.append(target)
    return written


def sync_catalog_file() -> list[dict]:
    with open(CATALOG_PATH, encoding='utf-8') as fh:
        catalog: list[dict] = json.load(fh)
    for row in catalog:
        enrich_catalog_row(row)
    with open(CATALOG_PATH, 'w', encoding='utf-8') as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    return catalog


def sync_overrides(catalog: list[dict]) -> int:
    overrides = export_khmer_overrides(catalog)
    OVERRIDES_PATH.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    for target in FRONTEND_OVERRIDE_PATHS:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(OVERRIDES_PATH.read_text(encoding='utf-8'), encoding='utf-8')
    return len(overrides)


def sync_meta(catalog: list[dict]) -> int:
    if not META_PATH.is_file():
        return 0
    meta = sync_reference_meta_from_catalog(catalog)
    META_PATH.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    return len(meta)


def sync_database(catalog: list[dict]) -> int:
    sys.path.insert(0, str(ROOT / 'backend'))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    try:
        import django
        django.setup()
    except Exception as exc:
        print(f'Database sync skipped: {exc}')
        return 0

    from khmer_speech import ensure_khmer_speech_fields  # noqa: E402
    from traffic_signs.models import TrafficSign  # noqa: E402

    by_code = {(r.get('sign_code') or '').upper(): r for r in catalog if r.get('sign_code')}
    updated = 0
    for sign in TrafficSign.objects.all().order_by('sign_code'):
        code = (sign.sign_code or '').upper()
        catalog_row = by_code.get(code, {})
        payload = {
            'sign_code': code,
            'class_key': catalog_row.get('class_key', ''),
            'category': catalog_row.get('category') or sign.category or '',
            'sign_name': sign.sign_name,
            'sign_name_km': catalog_row.get('sign_name_km') or sign.sign_name_km or sign.sign_name,
            'sign_name_en': catalog_row.get('sign_name_en') or sign.sign_name_en or sign.sign_name,
            'description': catalog_row.get('description') or sign.description,
            'description_en': catalog_row.get('description_en') or sign.description_en,
            'guidance': catalog_row.get('guidance') or sign.guidance,
            'guidance_en': catalog_row.get('guidance_en') or sign.guidance_en,
        }
        enriched = ensure_khmer_speech_fields(payload)
        sign.sign_name = enriched.get('sign_name') or enriched['sign_name_km']
        sign.sign_name_km = enriched['sign_name_km']
        sign.sign_name_en = enriched.get('sign_name_en') or sign.sign_name_en
        sign.description = enriched['description']
        sign.description_en = enriched.get('description_en') or sign.description_en
        sign.guidance = enriched.get('guidance') or sign.guidance
        sign.guidance_en = enriched.get('guidance_en') or sign.guidance_en
        sign.save(update_fields=[
            'sign_name', 'sign_name_km', 'sign_name_en',
            'description', 'description_en', 'guidance', 'guidance_en',
        ])
        updated += 1
    return updated


def main() -> None:
    if not CATALOG_PATH.is_file():
        print(f'Missing {CATALOG_PATH}')
        sys.exit(1)

    catalog = sync_catalog_file()
    override_count = sync_overrides(catalog)
    meta_count = sync_meta(catalog)
    db_count = sync_database(catalog)
    frontend_json = sync_frontend_ai_json()

    print(f'Catalog rows enriched: {len(catalog)}')
    print(f'Overrides written: {override_count} -> {OVERRIDES_PATH.name}')
    print(f'Reference meta entries: {meta_count}')
    print(f'Database signs updated: {db_count}')
    for target in FRONTEND_OVERRIDE_PATHS:
        print(f'Frontend copy: {target.relative_to(ROOT)}')
    for target in frontend_json:
        if target.name != 'sign_khmer_overrides.json':
            print(f'Frontend JSON: {target.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
