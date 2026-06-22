"""Resolve and load the active traffic sign catalog (236-class or 10-class thesis set)."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(settings.BASE_DIR).parent / 'ai'
DEFAULT_CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
CATALOG_10_PATH = AI_ROOT / 'traffic_sign_catalog_10.json'
TRAINING_STATUS_PATH = AI_ROOT / 'weights' / 'training_status.json'

_CATALOG_ROWS_CACHE: list[dict] | None = None
_CATALOG_PATH_CACHE: Path | None = None

# Official Cambodia codes (DB / media filenames) for the 10-class thesis set.
CLASS_OFFICIAL_CODES: dict[str, str] = {
    'NO_ENTRY': 'PW03-R1-04',
    'NO_LEFT_TURN': 'PW03-R1-01',
    'NO_RIGHT_TURN': 'PW03-R1-02',
    'NO_U_TURN': 'PW03-R1-03',
    'NO_PARKING': 'PW03-R2-10',
    'M_STOP': 'M-032',
    'P_SPEED_LIMIT_20_KM_H': 'P-029',
    'P_SPEED_LIMIT_50_KM_H': 'P-030',
    'W_PEDESTRIAN_CROSSING': 'W-040',
    'I_ONE_WAY_TRAFFIC': 'I-064',
}

_CATEGORY_TO_MODEL: dict[str, str] = {
    'prohibitory': 'prohibitory',
    'prohibitory sign': 'prohibitory',
    'mandatory': 'mandatory',
    'mandatory sign': 'mandatory',
    'regulatory': 'prohibitory',
    'regulatory sign': 'prohibitory',
    'warning': 'warning',
    'warning sign': 'warning',
    'informative': 'informative',
    'information': 'informative',
    'information sign': 'informative',
}


def normalize_category_label(category: str) -> str:
    key = (category or '').strip().lower()
    return _CATEGORY_TO_MODEL.get(key, 'warning')


def official_sign_code_for_row(row: dict) -> str:
    class_key = (row.get('class_key') or '').upper().strip()
    return CLASS_OFFICIAL_CODES.get(class_key, (row.get('sign_code') or '').upper())


def normalize_catalog_row(row: dict) -> dict:
    """Map thesis catalog fields to the legacy keys used by detection services."""
    class_key = (row.get('class_key') or '').upper().strip()
    sign_code = (row.get('sign_code') or '').strip()
    sign_name_km = row.get('sign_name_km') or row.get('sign_name', '')
    description_km = row.get('description_km') or row.get('description', '')
    yolo_id = row.get('yolo_class_id', row.get('id'))

    normalized = {
        **row,
        'class_key': class_key,
        'sign_code': sign_code,
        'official_sign_code': official_sign_code_for_row(row),
        'display_code': sign_code,
        'sign_name': sign_name_km,
        'sign_name_km': sign_name_km,
        'description': description_km,
        'description_km': description_km,
        'category': normalize_category_label(row.get('category', '')),
        'category_label': row.get('category', ''),
    }
    if yolo_id is not None:
        normalized['yolo_class_id'] = yolo_id
        normalized['id'] = yolo_id
    return normalized


def _env_catalog_path() -> Path | None:
    raw = (os.getenv('AI_SIGN_CATALOG_PATH') or '').strip()
    if not raw:
        return None
    path = Path(raw)
    if not path.is_absolute():
        path = AI_ROOT / path
    return path if path.is_file() else None


def _read_training_status() -> dict:
    if not TRAINING_STATUS_PATH.is_file():
        return {}
    try:
        return json.loads(TRAINING_STATUS_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        logger.warning('Could not read %s', TRAINING_STATUS_PATH)
        return {}


def resolve_catalog_path() -> Path:
    env_path = _env_catalog_path()
    if env_path:
        return env_path

    status = _read_training_status()
    class_count = int(status.get('yolo_class_count') or 0)
    if class_count == 10 and CATALOG_10_PATH.is_file():
        return CATALOG_10_PATH

    return DEFAULT_CATALOG_PATH


def _normalize_catalog_payload(data: object) -> list[dict]:
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        signs = data.get('signs')
        if isinstance(signs, list):
            return [row for row in signs if isinstance(row, dict)]
    return []


def load_sign_catalog_rows(*, force_reload: bool = False) -> list[dict]:
    global _CATALOG_ROWS_CACHE, _CATALOG_PATH_CACHE

    path = resolve_catalog_path()
    if not force_reload and _CATALOG_ROWS_CACHE is not None and _CATALOG_PATH_CACHE == path:
        return _CATALOG_ROWS_CACHE

    if not path.is_file():
        _CATALOG_ROWS_CACHE = []
        _CATALOG_PATH_CACHE = path
        return _CATALOG_ROWS_CACHE

    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        logger.warning('Could not read sign catalog at %s', path)
        _CATALOG_ROWS_CACHE = []
        _CATALOG_PATH_CACHE = path
        return _CATALOG_ROWS_CACHE

    _CATALOG_ROWS_CACHE = [
        normalize_catalog_row(row) for row in _normalize_catalog_payload(payload)
    ]
    _CATALOG_PATH_CACHE = path
    return _CATALOG_ROWS_CACHE


def invalidate_catalog_cache() -> None:
    global _CATALOG_ROWS_CACHE, _CATALOG_PATH_CACHE
    _CATALOG_ROWS_CACHE = None
    _CATALOG_PATH_CACHE = None
