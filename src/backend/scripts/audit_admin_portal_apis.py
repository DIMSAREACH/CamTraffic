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

from django.conf import settings
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

    # Every Admin portal module dependency (GET must succeed with live DB).
    checks = [
        # Dashboard
        ('GET', '/api/admin/dashboard/'),
        ('GET', '/api/cameras/live-status/'),
        # Users / RBAC
        ('GET', '/api/admin/users/?page_size=5'),
        ('GET', '/api/officers/?page_size=5'),
        ('GET', '/api/drivers/?page_size=5'),
        # Infrastructure
        ('GET', '/api/roads/?page_size=5'),
        ('GET', '/api/admin/cameras/?page_size=5'),
        ('GET', '/api/signs/?page_size=5'),
        # Fleet / enforcement
        ('GET', '/api/vehicles/?page_size=5'),
        ('GET', '/api/violations/?page_size=5'),
        ('GET', '/api/fines/?page_size=5'),
        ('GET', '/api/appeals/?page_size=5'),
        ('GET', '/api/unknown-vehicles/?page_size=5'),
        # AI
        ('GET', '/api/ai/logs/?page_size=5'),
        ('GET', '/api/ai/stats/'),
        ('GET', '/api/ai/model-metrics/'),
        ('GET', '/api/ai-models/'),
        ('GET', '/api/datasets/'),
        ('GET', '/api/dashboard/evidence/?page_size=5'),
        # Notifications
        ('GET', '/api/notifications/'),
        ('GET', '/api/notifications/admin/?page_size=5'),
        ('GET', '/api/notifications/admin/templates/'),
        ('GET', '/api/notifications/admin/schedules/'),
        ('GET', '/api/notifications/admin/report-schedules/'),
        # Ops
        ('GET', '/api/admin/audit/?page_size=5'),
        ('GET', '/api/rbac/roles/'),
        ('GET', '/api/officers/stations/?page_size=5'),
        ('GET', '/api/dashboard/admin/backups/'),
        ('GET', '/api/dashboard/admin/report/pdf/'),
        ('GET', '/api/imports/types/'),
        ('GET', '/api/imports/history/?page_size=5'),
        # Settings (any of these OK)
        ('GET', '/api/settings/'),
        # Analytics (live series — empty arrays OK)
        ('GET', '/api/dashboard/admin/analytics/detections/'),
        ('GET', '/api/dashboard/admin/analytics/heatmap/'),
        ('GET', '/api/dashboard/admin/analytics/officers/'),
        ('GET', '/api/dashboard/admin/analytics/drivers/'),
    ]

    results = []
    ok = True
    for method, path in checks:
        res = client.get(path)
        row = {'method': method, 'path': path, 'status': res.status_code}
        # 404 on optional analytics aliases is soft; everything else must be <400
        soft_404 = path == '/api/settings/'
        if res.status_code >= 400 and not (soft_404 and res.status_code == 404):
            # Try alternate settings path
            if path == '/api/settings/' and res.status_code == 404:
                alt = client.get('/api/admin/settings/')
                row['alt'] = '/api/admin/settings/'
                row['alt_status'] = alt.status_code
                if alt.status_code < 400:
                    print(f'OK   {alt.status_code} /api/admin/settings/ (alt)')
                    results.append(row)
                    continue
            ok = False
            row['body'] = str(res.content[:300])
            print(f'FAIL {res.status_code} {path}')
        else:
            print(f'OK   {res.status_code} {path}')
        results.append(row)

    # Broadcast (creates real in-app notification)
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
    b_row = {
        'method': 'POST',
        'path': '/api/notifications/admin/broadcast/',
        'status': broadcast.status_code,
    }
    if broadcast.status_code >= 400:
        ok = False
        b_row['body'] = str(broadcast.content[:400])
        print(f'FAIL {broadcast.status_code} broadcast')
    else:
        print(f'OK   {broadcast.status_code} broadcast')
    results.append(b_row)

    # Camera frame resolve — reject unresolved demo paths
    from ai_detection.frame_capture import resolve_local_frame_path
    from infrastructure.models import Camera

    path_ok = True
    demo_live = 0
    for cam in Camera.objects.all()[:50]:
        url = ''
        if hasattr(cam, 'effective_frame_url'):
            url = cam.effective_frame_url() or ''
        if not url:
            url = getattr(cam, 'frame_source_url', '') or getattr(cam, 'rtsp_url', '') or ''
        if not url:
            continue
        resolved = resolve_local_frame_path(url) if url.startswith('/') else True
        entry = {'camera': cam.code, 'url': url, 'resolved': bool(resolved)}
        results.append({'camera_frame': entry})
        if 'demo-cameras' in url or url.startswith('/demo-'):
            demo_live += 1
        if url.startswith('/') and not resolved:
            path_ok = False
            ok = False
            print(f'FAIL camera frame {cam.code} {url}')
        else:
            print(f'OK   camera {cam.code} frame')

    # Env / mock guards
    mock_ai = bool(getattr(settings, 'AI_USE_MOCK', False))
    demo_viol = bool(getattr(settings, 'AI_PIPELINE_DEMO_VIOLATION', False))
    if mock_ai or demo_viol:
        ok = False
        print(f'FAIL AI_USE_MOCK={mock_ai} AI_PIPELINE_DEMO_VIOLATION={demo_viol}')
    else:
        print(f'OK   AI_USE_MOCK={mock_ai} AI_PIPELINE_DEMO_VIOLATION={demo_viol}')

    # DB must have real operational rows (not empty seed)
    from django.apps import apps

    counts = {}
    for label, model_path in [
        ('users', 'users.User'),
        ('cameras', 'infrastructure.Camera'),
        ('vehicles', 'vehicles.Vehicle'),
        ('violations', 'violations.TrafficViolation'),
        ('fines', 'fines.Fine'),
        ('appeals', 'appeals.ViolationAppeal'),
        ('signs', 'traffic_signs.TrafficSign'),
        ('ai_logs', 'ai_detection.AIDetectionLog'),
    ]:
        try:
            Model = apps.get_model(model_path)
            counts[label] = Model.objects.count()
        except Exception as exc:  # noqa: BLE001
            counts[label] = f'error:{exc}'

    print(f'DB counts: {counts}')
    if isinstance(counts.get('violations'), int) and counts['violations'] < 1:
        print('WARN violations empty — UI will show empty tables (correct if DB is fresh)')

    if demo_live > 0:
        ok = False
        print(f'FAIL {demo_live} cameras still use demo-cameras URLs (cleared expected)')
    else:
        print('OK   no demo-cameras URLs on Camera rows')

    report = {
        'ok': ok and path_ok,
        'admin': admin.email,
        'demo_camera_urls': demo_live,
        'counts': counts,
        'ai_use_mock': mock_ai,
        'ai_pipeline_demo_violation': demo_viol,
        'results': results,
        'notes': [
            'Admin portal must use VITE_USE_MOCK=false and VITE_USE_SAMPLE_FALLBACK=false',
            'VITE_ALLOW_DEMO_VIOLATION=false and VITE_ALLOW_DEMO_ASSETS=false',
            'Empty tables mean empty DB — correct production behavior',
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(f'\nWrote {OUT}')
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
