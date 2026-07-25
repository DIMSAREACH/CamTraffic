#!/usr/bin/env python
"""Officer Portal production API audit — live REST + DB + YOLO, no demo/sample paths."""
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
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

User = get_user_model()
OUT = BACKEND / 'logs' / 'officer_portal_api_audit.json'


def _ok(status: int) -> bool:
    return 200 <= status < 400


def _find_real_image() -> Path | None:
    """Prefer AI evidence/uploads; fall back to production CCTV stills (not demo-cameras)."""
    from django.conf import settings

    media = Path(settings.MEDIA_ROOT)
    candidates = [
        *sorted((media / 'ai' / 'evidence').glob('*.jpg'))[:3],
        *sorted((media / 'ai' / 'uploads').glob('*.jpg'))[:3],
        media / 'cctv' / 'monivong-intersection.jpg',
        media / 'cctv' / 'monivong-ptz.jpg',
        media / 'cctv' / 'nr6-highway.jpg',
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def main() -> int:
    officer = (
        User.objects.filter(role='police', is_active=True, deleted_at__isnull=True).first()
        or User.objects.filter(role='police', is_active=True).first()
    )
    if not officer:
        print('FAIL: no active police/officer user in DB')
        return 1

    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'
    client.force_authenticate(user=officer)

    checks = [
        ('GET', '/api/officer/'),
        ('GET', '/api/officer/dashboard/'),
        ('GET', '/api/officer/detection-queue/'),
        ('GET', '/api/officer/violations/?page_size=5'),
        ('GET', '/api/officer/evidence/?limit=5'),
        ('GET', '/api/officer/fines/?page_size=5'),
        ('GET', '/api/officer/fines/lookup/?license=PP'),
        ('GET', '/api/officer/live-cameras/'),
        ('GET', '/api/officer/cameras/?page_size=5'),
        ('GET', '/api/officer/reports/'),
        ('GET', '/api/officer/assigned-cases/'),
        ('GET', '/api/appeals/?page_size=5'),
        ('GET', '/api/notifications/'),
        ('GET', '/api/ai/stats/'),
        ('GET', '/api/ai/logs/?page_size=5'),
        ('GET', '/api/detection/'),
        ('GET', '/api/signs/?page_size=5'),
        ('GET', '/api/unknown-vehicles/?page_size=5'),
        ('GET', '/api/drivers/?page_size=5'),
        ('GET', '/api/violations/rules/'),
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

        # Verify payment route is mounted under officer domain
        from django.urls import reverse
        from uuid import uuid4

        verify_path = reverse('domain-officer-fine-verify-payment', kwargs={'pk': uuid4()})
        verify_res = client.post(verify_path, {'approve': True}, format='json')
        verify_ok = verify_res.status_code in (400, 404)
        results.append({
            'method': 'POST',
            'path': verify_path,
            'status': verify_res.status_code,
            'route_mounted': verify_ok,
        })
        if not verify_ok:
            ok = False
            print(f'FAIL verify-payment route {verify_res.status_code} {verify_path}')
        else:
            print(f'OK   verify-payment route mounted ({verify_res.status_code})')

        # RBAC: officer must not access admin-only domain
        admin_block = client.get('/api/admin/dashboard/')
        results.append({
            'method': 'GET',
            'path': '/api/admin/dashboard/',
            'status': admin_block.status_code,
            'expect': '403',
        })
        if admin_block.status_code != 403:
            ok = False
            print(f'FAIL expected 403 for officer on admin dashboard, got {admin_block.status_code}')
        else:
            print('OK   403 officer blocked from /api/admin/dashboard/')

        # Production truth: no demo-cameras URLs left on Camera rows
        from ai_detection.frame_capture import resolve_local_frame_path
        from infrastructure.models import Camera

        demo_cams = list(
            Camera.objects.filter(frame_source_url__icontains='demo-cameras')
            .values_list('code', 'frame_source_url')
        )
        results.append({'demo_camera_rows': demo_cams})
        if demo_cams:
            ok = False
            print(f'FAIL demo-cameras still on Camera rows: {demo_cams}')
        else:
            print('OK   no demo-cameras URLs on Camera rows')

        for cam in Camera.objects.exclude(frame_source_url='').order_by('code')[:12]:
            url = cam.effective_frame_url() if hasattr(cam, 'effective_frame_url') else cam.frame_source_url
            resolved = True
            if isinstance(url, str) and url.startswith('/'):
                resolved = bool(resolve_local_frame_path(url))
            entry = {'camera': cam.code, 'url': url, 'resolved': bool(resolved)}
            results.append({'camera_frame': entry})
            if not resolved:
                ok = False
                print(f'FAIL camera frame unresolved {cam.code} {url}')
            else:
                print(f'OK   camera {cam.code} frame')

        # Live detection: prefer local /media/cctv/ stills (reliable offline), then
        # try remote HTTP/RTSP cameras. Skip unreachable LAN IPs instead of failing
        # the whole audit on a single TimeoutError → 502.
        def _cam_url(c):
            return (
                c.effective_frame_url()
                if hasattr(c, 'effective_frame_url')
                else (c.frame_source_url or '')
            ) or ''

        local_cams = []
        remote_cams = []
        for cam in Camera.objects.filter(status='active').order_by('code'):
            url = _cam_url(cam)
            if not url or 'demo-cameras' in url:
                continue
            if url.startswith('/'):
                if resolve_local_frame_path(url):
                    local_cams.append(cam)
            elif url.lower().startswith(('http://', 'https://', 'rtsp://', 'rtsps://')):
                remote_cams.append(cam)

        live_candidates = [*local_cams, *remote_cams]
        live_ok = False
        if not live_candidates:
            print('SKIP live camera detect (no non-demo frame_source_url — set RTSP/HTTP or /media/cctv/)')
            results.append({'live_camera_detect': 'skipped_no_frame'})
        else:
            for live_cam in live_candidates[:6]:
                detect = client.post(
                    '/api/detection/live/',
                    {
                        'camera_id': str(live_cam.id),
                        'full_frame': 'true',
                        'live_scan': 'true',
                        'save_log': 'false',
                        'enable_ocr': 'false',
                        'live_fast': 'true',
                    },
                    format='multipart',
                )
                drow = {
                    'method': 'POST',
                    'path': '/api/detection/live/',
                    'status': detect.status_code,
                    'camera': live_cam.code or str(live_cam.id),
                    'url': _cam_url(live_cam)[:120],
                }
                if detect.status_code >= 400:
                    drow['body'] = str(detect.content[:400])
                    print(
                        f'WARN {detect.status_code} live detect '
                        f'{live_cam.code or live_cam.id} — trying next camera'
                    )
                    results.append(drow)
                    continue
                payload = getattr(detect, 'data', {}) or {}
                data = payload.get('data', payload) if isinstance(payload, dict) else {}
                vehicles = data.get('vehicles') or []
                drow['vehicles'] = len(vehicles) if isinstance(vehicles, list) else 0
                print(
                    f'OK   {detect.status_code} live detect '
                    f'{live_cam.code or live_cam.id} vehicles={drow["vehicles"]}'
                )
                results.append(drow)
                live_ok = True
                break
            if not live_ok:
                ok = False
                print('FAIL live detect (no reachable camera frame among candidates)')
                results.append({'live_camera_detect': 'failed_all_candidates'})

        # Upload detect — officer AI Detection Center path (real media file)
        img_path = _find_real_image()
        if img_path:
            upload = client.post(
                '/api/detection/live/',
                {
                    'image': SimpleUploadedFile(
                        img_path.name,
                        img_path.read_bytes(),
                        content_type='image/jpeg',
                    ),
                    'full_frame': 'true',
                    'save_log': 'false',
                    'enable_ocr': 'false',
                    'live_fast': 'true',
                },
                format='multipart',
            )
            urow = {
                'method': 'POST',
                'path': '/api/detection/live/ (upload)',
                'status': upload.status_code,
                'image': str(img_path),
            }
            if upload.status_code >= 400:
                ok = False
                urow['body'] = str(upload.content[:400])
                print(f'FAIL {upload.status_code} upload detect')
            else:
                print(f'OK   {upload.status_code} upload detect ({img_path.name})')
            results.append(urow)
        else:
            print('SKIP upload detect (no media image found)')
            results.append({'upload_detect': 'skipped_no_image'})

        # Detection queue reject on a synthetic pending_review row (does not consume fleet data)
        from django.utils import timezone
        from users.models import Driver
        from violations.models import TrafficViolation

        driver = Driver.objects.select_related('user').first()
        if not driver:
            print('SKIP queue reject (no driver row for synthetic violation)')
            results.append({'queue_reject': 'skipped_no_driver'})
        else:
            synthetic = TrafficViolation.objects.create(
                driver=driver,
                status='pending_review',
                violation_type='NO_ENTRY',
                description='Officer portal production audit — temporary row',
                detected_class_key='NO_ENTRY',
                observed_action='ENTER',
                plate_detected='AUDIT-TMP',
                location='Officer audit',
                violation_date=timezone.now(),
                ai_confidence_score=99,
            )
            try:
                reject = client.post(
                    f'/api/officer/violations/{synthetic.id}/reject/',
                    {'dismissal_reason': 'Officer portal production audit — false positive'},
                    format='json',
                )
                rrow = {
                    'method': 'POST',
                    'path': f'/api/officer/violations/{synthetic.id}/reject/',
                    'status': reject.status_code,
                }
                if reject.status_code >= 400:
                    ok = False
                    rrow['body'] = str(reject.content[:400])
                    print(f'FAIL {reject.status_code} reject queue item')
                else:
                    print(f'OK   {reject.status_code} reject queue item {synthetic.id}')
                results.append(rrow)
            finally:
                TrafficViolation.objects.filter(pk=synthetic.pk).delete()

        # Officer fine receipt PDF (enforcement copy)
        from fines.models import Fine

        fine = Fine.objects.order_by('-created_at').first()
        if fine:
            receipt = client.get(f'/api/fines/{fine.id}/receipt/pdf/')
            prow = {
                'method': 'GET',
                'path': f'/api/fines/{fine.id}/receipt/pdf/',
                'status': receipt.status_code,
                'content_type': receipt.get('Content-Type', ''),
            }
            if receipt.status_code != 200 or 'pdf' not in (receipt.get('Content-Type') or '').lower():
                ok = False
                print(f'FAIL officer receipt PDF {receipt.status_code}')
            else:
                print(f'OK   officer receipt PDF ({fine.id})')
            results.append(prow)

    # Data counts (production-truth presence)
    from appeals.models import ViolationAppeal
    from fines.models import Fine
    from infrastructure.models import Camera as CamModel
    from traffic_signs.models import TrafficSign
    from violations.models import TrafficViolation

    try:
        from ai_detection.models import AIDetectionLog
        ai_logs = AIDetectionLog.objects.count()
    except Exception:
        ai_logs = 0

    pending_n = TrafficViolation.objects.filter(status='pending_review').count()
    counts = {
        'officers': User.objects.filter(role='police', is_active=True).count(),
        'violations': TrafficViolation.objects.count(),
        'pending_review': pending_n,
        'fines': Fine.objects.count(),
        'appeals': ViolationAppeal.objects.count(),
        'cameras': CamModel.objects.count(),
        'cameras_with_frame': CamModel.objects.exclude(frame_source_url='').count(),
        'signs': TrafficSign.objects.count(),
        'ai_logs': ai_logs,
    }
    print('\nDB counts:', counts)
    for key, min_n in (
        ('officers', 1),
        ('violations', 1),
        ('fines', 1),
        ('cameras', 1),
        ('signs', 1),
        ('pending_review', 1),
    ):
        if counts.get(key, 0) < min_n:
            ok = False
            print(f'FAIL insufficient real data: {key}={counts.get(key)}')

    report = {
        'ok': ok,
        'officer': getattr(officer, 'email', None) or str(officer.pk),
        'counts': counts,
        'results': results,
        'notes': [
            'Officer portal must use VITE_USE_MOCK=false, VITE_USE_SAMPLE_FALLBACK=false,',
            'VITE_ALLOW_DEMO_VIOLATION=false, VITE_ALLOW_DEMO_ASSETS=false',
            'AI_USE_MOCK=False and AI_PIPELINE_DEMO_VIOLATION=False on backend',
            'Camera.frame_source_url must not use demo-cameras; use /media/cctv/ or RTSP/HTTP',
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(f'\nWrote {OUT}')
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
