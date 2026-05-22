"""Load sign display names and descriptions by official code (R1-01, etc.)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OVERRIDES_PATH = ROOT / 'sign_metadata_overrides.json'
CATALOG_PATH = ROOT / 'sign_catalog.json'


@lru_cache(maxsize=1)
def load_overrides() -> dict[str, dict]:
    if not OVERRIDES_PATH.exists():
        return {}
    data = json.loads(OVERRIDES_PATH.read_text(encoding='utf-8'))
    return {k.upper().replace('_', '-'): v for k, v in data.items()}


def metadata_for_code(sign_code: str) -> dict | None:
    """Return {sign_name, description, guidance, sign_name_km?} for a code like R1-01."""
    if not sign_code:
        return None
    code = sign_code.upper().replace('_', '-')
    overrides = load_overrides()
    if code in overrides:
        return dict(overrides[code])

    if CATALOG_PATH.exists():
        catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
        for row in catalog:
            if row.get('sign_code', '').upper() == code:
                name = row.get('sign_name', '')
                if name and not name.startswith('Traffic Sign '):
                    return {
                        'sign_name': name,
                        'description': row.get('description', ''),
                        'guidance': row.get('guidance', ''),
                    }
                break
    return None


def apply_metadata_to_catalog() -> int:
    """Merge overrides into sign_catalog.json; returns number updated."""
    if not CATALOG_PATH.exists():
        return 0
    catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    overrides = load_overrides()
    updated = 0
    for row in catalog:
        code = row.get('sign_code', '').upper()
        if code in overrides:
            row.update(overrides[code])
            updated += 1
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    return updated
