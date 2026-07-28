#!/usr/bin/env python
"""Citizen (Driver) Portal production API audit — live REST only, no sample/mock data."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.test import override_settings
from rest_framework.test import APIClient

User = get_user_model()
OUT = BACKEND / 'logs' / 'citizen_portal_api_audit.json'


def _ok(status: int) -> bool:
    return 200 <= status < 400


def _pick_driver():
    """Prefer a driver with real owned vehicles + fines so modules are non-empty."""
    rich = (
        User.objects.filter(role='driver', is_active=True, deleted_at__isnull=True)
        .annotate(vc=Count('vehicles'), fc=Count('fines_received'))
        .filter(vc__gt=0, fc__gt=0)
        .order_by('-fc')
        .first()
    )
    if rich:
        return rich
    return (
        User.objects.filter(role='driver', is_active=True, deleted_at__isnull=True).first()
        or User.objects.filter(role='driver', is_active=True).first()
    )


def main() -> int:
    driver = _pick_driver()
    if not driver:
        print('FAIL: no active driver user in DB')
        return 1

    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'
    client.force_authenticate(user=driver)

    checks = [
        ('GET', '/api/citizen/'),
        ('GET', '/api/citizen/dashboard/'),
        ('GET', '/api/citizen/profile/'),
        ('GET', '/api/citizen/vehicles/?page_size=5'),
        ('GET', '/api/citizen/violations/?page_size=5'),
        ('GET', '/api/citizen/violations/map/'),
        ('GET', '/api/citizen/violations/heatmap/'),
        ('GET', '/api/citizen/fines/?page_size=5'),
        ('GET', '/api/citizen/fines/payment-config/'),
        ('GET', '/api/citizen/fines/installments/'),
        ('GET', '/api/citizen/appeals/?page_size=5'),
        ('GET', '/api/citizen/notifications/'),
        ('GET', '/api/signs/?page_size=5'),
        ('GET', '/api/auth/profile/'),
        ('GET', '/api/auth/profile/overview/'),
    ]

    results = []
    ok = True

    with override_settings(ALLOWED_HOSTS=['*']):
        for method, path in checks:
            res = client.get(path) if method == 'GET' else client.post(path, {}, format='json')
            row = {'method': method, 'path': path, 'status': res.status_code}
            if not _ok(res.status_code):
                ok = False
                row['body'] = str(res.content[:400])
                print(f'FAIL {res.status_code} {path}')
            else:
                print(f'OK   {res.status_code} {path}')
            results.append(row)

        # Fine detail + installment quote (POST) when driver has a fine
        from fines.models import Fine

        fine = Fine.objects.filter(driver=driver).order_by('-created_at').first()
        if fine:
            detail_path = f'/api/citizen/fines/{fine.id}/'
            detail = client.get(detail_path)
            results.append({'method': 'GET', 'path': detail_path, 'status': detail.status_code})
            if not _ok(detail.status_code):
                ok = False
                print(f'FAIL {detail.status_code} {detail_path}')
            else:
                print(f'OK   {detail.status_code} {detail_path}')

            quote_path = f'/api/citizen/fines/{fine.id}/installments/quote/'
            quote = client.post(quote_path, {'num_installments': 3}, format='json')
            results.append({'method': 'POST', 'path': quote_path, 'status': quote.status_code})
            if quote.status_code not in (200, 400):
                # 400 = fine not eligible — still a live API response, not a crash
                ok = False
                print(f'FAIL {quote.status_code} POST {quote_path}')
            else:
                print(f'OK   {quote.status_code} POST {quote_path}')

            # Payment config must not advertise demo fallback
            pay = client.get('/api/citizen/fines/payment-config/')
            pay_data = pay.json().get('data') if isinstance(pay.json(), dict) else {}
            if isinstance(pay_data, dict) and pay_data.get('demo_fallback') is True:
                ok = False
                print('FAIL payment-config demo_fallback=true (must be false for production)')
            else:
                print('OK   payment-config demo_fallback=false')

        # Violation detail with AI evidence fields when available
        from violations.models import TrafficViolation

        viol = TrafficViolation.objects.filter(driver__user=driver).order_by('-created_at').first()
        if viol:
            vpath = f'/api/citizen/violations/{viol.id}/'
            vres = client.get(vpath)
            results.append({'method': 'GET', 'path': vpath, 'status': vres.status_code})
            if not _ok(vres.status_code):
                ok = False
                print(f'FAIL {vres.status_code} {vpath}')
            else:
                print(f'OK   {vres.status_code} {vpath}')

        # RBAC: driver must not access officer/admin domains
        for blocked in ('/api/officer/dashboard/', '/api/admin/dashboard/'):
            block = client.get(blocked)
            results.append({'method': 'GET', 'path': blocked, 'status': block.status_code, 'expect': '403'})
            if block.status_code != 403:
                ok = False
                print(f'FAIL expected 403 for driver on {blocked}, got {block.status_code}')
            else:
                print(f'OK   403 driver blocked from {blocked}')

    from appeals.models import ViolationAppeal
    from fines.models import Fine
    from vehicles.models import Vehicle
    from violations.models import TrafficViolation

    counts = {
        'drivers': User.objects.filter(role='driver', is_active=True).count(),
        'vehicles': Vehicle.objects.count(),
        'violations': TrafficViolation.objects.count(),
        'fines': Fine.objects.count(),
        'appeals': ViolationAppeal.objects.count(),
        'audit_driver_vehicles': Vehicle.objects.filter(owner=driver).count(),
        'audit_driver_fines': Fine.objects.filter(driver=driver).count(),
    }
    print('\nDB counts:', counts)
    for key, min_n in (('drivers', 1), ('fines', 0), ('vehicles', 0)):
        if counts.get(key, 0) < min_n:
            ok = False
            print(f'FAIL insufficient real data: {key}={counts.get(key)}')

    report = {
        'ok': ok,
        'driver': getattr(driver, 'email', None) or str(driver.pk),
        'counts': counts,
        'results': results,
        'notes': [
            'Citizen portal must use VITE_USE_MOCK=false, VITE_USE_SAMPLE_FALLBACK=false,',
            'VITE_ALLOW_DEMO_VIOLATION=false, VITE_ALLOW_DEMO_ASSETS=false',
            'Driver (/citizen) path hard-blocks mock/sample even if flags are flipped in DEV.',
            'Traffic Rules + Support pages are educational/static by design (not sample DB rows).',
            'AI enters the driver portal as violation evidence (plate/sign crops), not as an operational AI console.',
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(f'\nWrote {OUT}')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
