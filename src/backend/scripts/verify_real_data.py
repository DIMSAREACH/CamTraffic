#!/usr/bin/env python
"""Verify production-truth runtime: live backend data only (no mock AI, seeded DB)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.conf import settings  # noqa: E402


def main() -> int:
    from django.contrib.auth import get_user_model
    from infrastructure.models import Camera
    from traffic_signs.models import TrafficSign

    User = get_user_model()
    failed = 0

    def ok(label: str, cond: bool, detail: str) -> None:
        nonlocal failed
        mark = 'PASS' if cond else 'FAIL'
        print(f'[{mark}] {label} — {detail}')
        if not cond:
            failed += 1

    ok('AI_USE_MOCK', not getattr(settings, 'AI_USE_MOCK', False), str(getattr(settings, 'AI_USE_MOCK', False)))
    ok('AI weights path set', bool(getattr(settings, 'AI_MODEL_PATH', '')), getattr(settings, 'AI_MODEL_PATH', ''))

    users = User.objects.filter(is_active=True).count()
    ok('Active users', users >= 3, f'{users} users (need admin/police/driver from seed_production)')

    roles = set(User.objects.filter(is_active=True).values_list('role', flat=True))
    ok('RBAC roles present', {'admin', 'police', 'driver'}.issubset(roles), ','.join(sorted(roles)))

    signs = TrafficSign.objects.count()
    ok('Traffic signs in DB', signs >= 10, f'{signs} catalog rows')

    cameras = Camera.objects.count()
    ok('Cameras in DB', cameras >= 1, f'{cameras} cameras')

    weights = Path(getattr(settings, 'AI_MODEL_PATH', '') or '')
    if not weights.is_file():
        weights = BACKEND.parent / 'ai' / 'weights' / 'best.pt'
    ok('YOLO weights file', weights.is_file(), str(weights))

    if failed:
        print('\nHint: python backend/manage.py seed_production')
        print('Frontends: VITE_USE_MOCK=false, VITE_USE_SAMPLE_FALLBACK=false')
        return 1
    print('\nReal-data runtime checks passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
