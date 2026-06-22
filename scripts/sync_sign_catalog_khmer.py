"""
Apply real Khmer/English sign names and descriptions to ai/sign_catalog.json.

Uses sign_khmer_overrides.json, reference_sign_meta.json, and khmer_speech.py.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ai'))

from khmer_speech import enrich_catalog_row  # noqa: E402

CATALOG_PATH = ROOT / 'ai' / 'sign_catalog.json'
FRONTEND_PATHS = [
    ROOT / 'frontend-admin' / 'shared' / 'data' / 'sign_khmer_overrides.json',
    ROOT / 'frontend-user' / 'shared' / 'data' / 'sign_khmer_overrides.json',
]
OVERRIDES_PATH = ROOT / 'ai' / 'sign_khmer_overrides.json'


def main() -> None:
    if not CATALOG_PATH.is_file():
        print(f'Missing {CATALOG_PATH}')
        sys.exit(1)

    with open(CATALOG_PATH, encoding='utf-8') as fh:
        catalog: list[dict] = json.load(fh)

    updated = 0
    for row in catalog:
        before = (
            row.get('sign_name_km'),
            row.get('description'),
            row.get('guidance'),
        )
        enrich_catalog_row(row)
        after = (
            row.get('sign_name_km'),
            row.get('description'),
            row.get('guidance'),
        )
        if before != after:
            updated += 1

    with open(CATALOG_PATH, 'w', encoding='utf-8') as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    if OVERRIDES_PATH.is_file():
        for target in FRONTEND_PATHS:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(OVERRIDES_PATH.read_text(encoding='utf-8'), encoding='utf-8')

    # Mirror remaining ai/*.json to frontend shared/data
    for name in ('sign_catalog.json', 'reference_sign_meta.json', 'cambodia_stem_to_class.json'):
        source = ROOT / 'ai' / name
        if not source.is_file():
            continue
        text = source.read_text(encoding='utf-8')
        for base in (ROOT / 'frontend-admin' / 'shared' / 'data', ROOT / 'frontend-user' / 'shared' / 'data'):
            base.mkdir(parents=True, exist_ok=True)
            (base / name).write_text(text, encoding='utf-8')

    print(f'Updated {updated}/{len(catalog)} catalog rows in {CATALOG_PATH.name}')


if __name__ == '__main__':
    main()
