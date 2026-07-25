#!/usr/bin/env python
"""Admin Portal production API audit — live REST only, no sample/mock data."""
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
from rest_framework.test import APIClient

User = get_user_model()
OUT = BACKEND / 'logs' / 'admin_portal_api_audit.json'


def main() -> int:
    admin = User.objects.filter(role='admin', is_active=True).first()
    if not admin:
        print('FAIL: no active admin user in DB')
        return 1

    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'
    client.force_authenticate(user=admin)

    checks = [
        ('GET', '/api/admin/dashboard/'),
        ('GET', '/api/admin/users/?page_size=5'),
        ('GET', '/api/roads/?page_size=5'),
        ('GET', '/api/admin/cameras/?page_size=5'),
        ('GET', '/api/vehicles/?page_size=5'),
        ('GET', '/api/violations/?page_size=5'),
        ('GET', '/api/fines/?page_size=5'),
        ('GET', '/api/appeals/?page_size=5'),
        ('GET', '/api/signs/?page_size=5'),
        ('GET', '/api/ai/logs/?page_size=5'),
        ('GET', '/api/ai/stats/'),
        ('GET', '/api/notifications/'),
        ('GET', '/api/notifications/admin/?page_size=5'),
        ('GET', '/api/admin/audit/?page_size=5'),
        ('GET', '/api/officers/?page_size=5'),
        ('GET', '/api/drivers/?page_size=5'),
    ]

    results = []
    ok = True
    for method, path in checks:
        if method == 'GET':
            res = client.get(path)
        else:
            res = client.post(path, {}, format='json')
        row = {'method': method, 'path': path, 'status': res.status_code}
        if res.status_code >= 400:
            ok = False
            row['body'] = str(res.content[:300])
            print(f'FAIL {res.status_code} {path}')
        else:
            print(f'OK   {res.status_code} {path}')
        results.append(row)

    # Broadcast smoke (creates real rows — use unique title)
    broadcast = client.post(
        '/api/notifications/admin/broadcast/',
        {
            'title': 'Admin Portal API Audit',
            'message': 'Production audit ping — safe to delete.',
            'recipient': 'admin',
            'type': 'system',
            'channels': ['system'],
        },
        format='json',
    )
    b_row = {'method': 'POST', 'path': '/api/notifications/admin/broadcast/', 'status': broadcast.status_code}
    if broadcast.status_code >= 400:
        ok = False
        b_row['body'] = str(broadcast.content[:400])
        print(f'FAIL {broadcast.status_code} broadcast')
    else:
        print(f'OK   {broadcast.status_code} broadcast')
    results.append(b_row)

    # Camera frame resolve
    from ai_detection.frame_capture import resolve_local_frame_path
    from infrastructure.models import Camera

    path_ok = True
    for cam in Camera.objects.exclude(frame_source_url='')[:5]:
        url = cam.effective_frame_url() if hasattr(cam, 'effective_frame_url') else cam.frame_source_url
        resolved = resolve_local_frame_path(url) if url.startswith('/') else True
        entry = {'camera': cam.code, 'url': url, 'resolved': bool(resolved)}
        results.append({'camera_frame': entry})
        if url.startswith('/demo-cameras/') and not resolved:
            path_ok = False
            ok = False
            print(f'FAIL camera frame {cam.code} {url}')
        else:
            print(f'OK   camera {cam.code} frame')

    report = {
        'ok': ok and path_ok,
        'admin': admin.email,
        'results': results,
        'notes': [
            'Admin portal must use VITE_USE_MOCK=false and VITE_USE_SAMPLE_FALLBACK=false',
            'demo-cameras now use real Phnom Penh vehicle dataset frames',
            'Notification list/send use /api/notifications/admin/*',
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(f'\nWrote {OUT}')
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
