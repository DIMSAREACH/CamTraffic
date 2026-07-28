"""Live REST audit for Admin / Officer / Driver portals (real DB, no mock)."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402

User = get_user_model()

ACCOUNTS = {
    'admin': 'admin@camtraffic.demo',
    'officer': 'officer@camtraffic.demo',
    'driver': 'driver@camtraffic.demo',
}

CHECKS = {
    # Admin portal modules → REST endpoints (Cambodia thesis namespaces + legacy)
    'admin': [
        '/api/admin/dashboard/',
        '/api/admin/users/',
        '/api/admin/rbac/roles/',
        '/api/admin/cameras/',
        '/api/admin/audit/',
        '/api/admin/reports/',
        '/api/admin/settings/',
        '/api/admin/ai-models/',
        '/api/officers/',
        '/api/drivers/',
        '/api/vehicles/',
        '/api/vehicles/owners/',
        '/api/violations/',
        '/api/violations/rules/',
        '/api/fines/',
        '/api/appeals/',
        '/api/cameras/',
        '/api/roads/',
        '/api/signs/',
        '/api/detection/',
        '/api/ai/logs/',
        '/api/ai/stats/',
        '/api/ai/history/',
        '/api/ai/models/',
        '/api/ai/model-metrics/',
        '/api/notifications/',
        '/api/unknown-vehicles/',
        '/api/fines/payment-config/',
        '/api/imports/types/',
        '/api/audit/',
        '/api/rbac/roles/',
        '/api/auth/profile/',
        '/api/auth/profile/overview/',
    ],
    # Officer (Traffic Operations) portal
    'officer': [
        '/api/officer/dashboard/',
        '/api/officer/detection-queue/',
        '/api/officer/violations/',
        '/api/officer/fines/',
        '/api/officer/cameras/',
        '/api/officer/live-cameras/',
        '/api/officer/evidence/',
        '/api/officer/reports/',
        '/api/officer/assigned-cases/',
        '/api/officer/audit/',
        '/api/detection/',
        '/api/ai/logs/',
        '/api/ai/stats/',
        '/api/ai/history/',
        '/api/appeals/',
        '/api/notifications/',
        '/api/drivers/',
        '/api/signs/',
        '/api/unknown-vehicles/',
        '/api/auth/profile/',
        '/api/auth/profile/overview/',
    ],
    # Driver (Citizen) portal
    'driver': [
        '/api/citizen/dashboard/',
        '/api/citizen/profile/',
        '/api/citizen/vehicles/',
        '/api/citizen/violations/',
        '/api/citizen/violations/map/',
        '/api/citizen/violations/heatmap/',
        '/api/citizen/fines/',
        '/api/citizen/fines/payment-config/',
        '/api/citizen/appeals/',
        '/api/citizen/notifications/',
        '/api/signs/',
        '/api/auth/profile/',
        '/api/auth/profile/overview/',
    ],
}


def summarize(body) -> str:
    if not isinstance(body, dict):
        return ''
    data = body.get('data', body)
    if isinstance(data, list):
        return f' rows={len(data)}'
    if isinstance(data, dict):
        if 'results' in data and isinstance(data['results'], list):
            return f' rows={len(data["results"])}'
        if 'count' in data:
            return f' count={data["count"]}'
        return f' keys={len(data)}'
    return ''


def main() -> int:
    client = APIClient()
    client.defaults['HTTP_HOST'] = '127.0.0.1'
    failed = 0
    total = 0
    print('CamTraffic portal API audit (JWT + live DB)')

    for role, email in ACCOUNTS.items():
        print(f'\n== {role.upper()} ({email}) ==')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            print('  [FAIL] missing account')
            failed += 1
            continue
        access = str(RefreshToken.for_user(user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        print('  [PASS] token issued')
        for path in CHECKS[role]:
            total += 1
            resp = client.get(path)
            ok = 200 <= resp.status_code < 300
            mark = 'PASS' if ok else 'FAIL'
            if not ok:
                failed += 1
            try:
                body = resp.json()
            except Exception:
                body = None
            print(f'  [{mark}] GET {path} -> {resp.status_code}{summarize(body)}')
            if not ok and body is not None:
                print(f'         {json.dumps(body)[:220]}')

    print(f'\nResult: {total - failed}/{total} passed, {failed} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
