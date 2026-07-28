"""Ensure vehicle_config has Cambodia plate + license formats; normalize identity."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.core.management import call_command  # noqa: E402

from core.cambodia_identity import DEFAULT_VEHICLE_CONFIG  # noqa: E402
from core.models import SystemSetting  # noqa: E402


def main() -> int:
    row, created = SystemSetting.objects.get_or_create(
        key='vehicle_config',
        defaults={
            'value': dict(DEFAULT_VEHICLE_CONFIG),
            'description': 'Vehicle / license plate identity formats',
            'is_public': False,
        },
    )
    value = dict(row.value or {})
    changed = False
    for key, default in DEFAULT_VEHICLE_CONFIG.items():
        if key not in value or value.get(key) in ('', None):
            value[key] = default
            changed = True
    # Always enforce canonical format labels for matching modules
    for key in (
        'plate_format',
        'plate_format_example',
        'plate_format_regex',
        'license_format',
        'license_format_example',
        'license_format_regex',
    ):
        if value.get(key) != DEFAULT_VEHICLE_CONFIG[key]:
            value[key] = DEFAULT_VEHICLE_CONFIG[key]
            changed = True
    if created or changed:
        row.value = value
        row.description = row.description or 'Vehicle / license plate identity formats'
        row.save()
        print('vehicle_config saved:', value)
    else:
        print('vehicle_config already up to date')

    call_command('normalize_cambodia_identity')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
