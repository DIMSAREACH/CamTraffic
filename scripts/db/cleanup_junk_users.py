"""Soft-deactivate junk / soft-deleted users so User Management stays clean."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.utils import timezone  # noqa: E402

from users.models import User  # noqa: E402

KEEP = {
    'admin@camtraffic.demo',
    'admin@camtraffic.gov.kh',
    'officer@camtraffic.demo',
    'officer@camtraffic.gov.kh',
    'driver@camtraffic.demo',
    'driver2@camtraffic.demo',
}


def main() -> int:
    deactivated = 0
    for u in User.objects.all():
        email = (u.email or '').lower()
        if email in KEEP:
            continue
        reason = None
        if u.deleted_at is not None and u.is_active:
            reason = 'soft-deleted-active'
        elif '_deleted_' in email:
            reason = 'deleted-email'
        elif email.endswith('@test.com'):
            reason = 'test.com'
        if not reason:
            continue
        u.is_active = False
        if u.deleted_at is None:
            u.deleted_at = timezone.now()
        u.save(update_fields=['is_active', 'deleted_at', 'updated_at'])
        deactivated += 1
        print('deactivated', reason, u.full_name, email)

    print('deactivated_count', deactivated)
    print(
        'active totals',
        {
            'admin': User.objects.filter(role='admin', is_active=True, deleted_at__isnull=True).count(),
            'police': User.objects.filter(role='police', is_active=True, deleted_at__isnull=True).count(),
            'driver': User.objects.filter(role='driver', is_active=True, deleted_at__isnull=True).count(),
        },
    )
    print('--- sample active for Users module ---')
    for u in User.objects.filter(is_active=True, deleted_at__isnull=True).order_by('role', 'full_name')[:18]:
        print(f'{u.role:7} {u.full_name:20} {u.email:35} {u.license_no or "-"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
