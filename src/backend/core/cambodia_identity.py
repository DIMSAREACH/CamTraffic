"""Cambodia identity formats shared by API, seeds, and System Settings.

License and plate use the same numbered form:
  2TE-1507  →  ^[1-9]\d?[A-Z]{1,2}-\d{4}$
"""
from __future__ import annotations

import re

PLATE_FORMAT_LABEL = 'NLL-NNNN'
PLATE_FORMAT_EXAMPLE = '2TE-1507'
PLATE_FORMAT_REGEX = r'^[1-9]\d?[A-Z]{1,2}-\d{4}$'

# License follows the same plate-number form across all modules.
LICENSE_FORMAT_LABEL = PLATE_FORMAT_LABEL
LICENSE_FORMAT_EXAMPLE = PLATE_FORMAT_EXAMPLE
LICENSE_FORMAT_REGEX = PLATE_FORMAT_REGEX

PLATE_RE = re.compile(PLATE_FORMAT_REGEX)
LICENSE_RE = re.compile(LICENSE_FORMAT_REGEX)

DEFAULT_VEHICLE_CONFIG = {
    'plate_format': PLATE_FORMAT_LABEL,
    'plate_format_example': PLATE_FORMAT_EXAMPLE,
    'plate_format_regex': PLATE_FORMAT_REGEX,
    'license_format': LICENSE_FORMAT_LABEL,
    'license_format_example': LICENSE_FORMAT_EXAMPLE,
    'license_format_regex': LICENSE_FORMAT_REGEX,
    'require_owner_link': True,
    'unknown_vehicle_alert': True,
    'retention_days': '365',
}


def normalize_plate(value: str | None) -> str:
    """Normalize to dashed Cambodia private plate: 2TE-1507."""
    raw = (value or '').upper().strip()
    if not raw:
        return ''
    cleaned = ''.join(ch for ch in raw if ch.isalnum())
    if not cleaned:
        return ''
    m = re.fullmatch(r'(\d{1,2})([A-Z]{1,2})(\d{4})', cleaned)
    if m:
        return f'{m.group(1)}{m.group(2)}-{m.group(3)}'
    if len(cleaned) > 4:
        return f'{cleaned[:-4]}-{cleaned[-4:]}'
    return cleaned


def is_valid_plate(value: str | None) -> bool:
    return bool(PLATE_RE.fullmatch(normalize_plate(value)))


def normalize_license(value: str | None) -> str:
    """License uses the same form as plate numbers (e.g. 2TE-1507)."""
    return normalize_plate(value)


def is_valid_license(value: str | None) -> bool:
    return is_valid_plate(value)
