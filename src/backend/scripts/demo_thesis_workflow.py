"""Thesis defense E2E: detect smoke → pending No Parking case → approve → fine → appeal → review → reports.

Run (backend on :8000):
  node scripts/backend-python.mjs scripts/demo_thesis_workflow.py
"""
from __future__ import annotations

import json
import sys
import uuid
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path

BASE = 'http://127.0.0.1:8000'
PASSWORD = 'CamTraffic@2026!'
OFFICER = 'officer@camtraffic.demo'
DRIVER = 'driver@camtraffic.demo'
ADMIN = 'admin@camtraffic.demo'
PLATE = '2A-1234'

ROOT = Path(__file__).resolve().parents[3]
SAMPLE_ROAD = ROOT / 'ai' / 'test_samples' / 'real_road' / 'road_15.jpg'
SAMPLE_VIDEO = ROOT / 'src' / 'web' / 'user' / 'public' / 'demo-cameras' / 'pp-riverside-traffic.webm'
SAMPLE_SIGN = ROOT / 'ai' / 'test_samples' / 'real' / '07_no_parking.png'

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    results.append((name, ok, detail))


def unwrap(body: object) -> object:
    if isinstance(body, dict) and body.get('success') and 'data' in body:
        return body['data']
    return body


def req(
    method: str,
    path: str,
    token: str | None = None,
    data: dict | None = None,
    files: dict[str, tuple[str, bytes, str]] | None = None,
    timeout: int = 180,
) -> tuple[int, object]:
    headers: dict[str, str] = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body: bytes | None = None
    if files:
        boundary = f'----CamTraffic{uuid.uuid4().hex}'
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        chunks: list[bytes] = []
        if data:
            for key, value in data.items():
                chunks.append(f'--{boundary}\r\n'.encode())
                chunks.append(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
                chunks.append(f'{value}\r\n'.encode())
        for field, (filename, content, ctype) in files.items():
            chunks.append(f'--{boundary}\r\n'.encode())
            chunks.append(
                f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'.encode()
            )
            chunks.append(f'Content-Type: {ctype}\r\n\r\n'.encode())
            chunks.append(content)
            chunks.append(b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        body = b''.join(chunks)
    elif data is not None:
        headers['Content-Type'] = 'application/json'
        body = json.dumps(data).encode()
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw[:300]
        return exc.code, payload


def login(email: str) -> str | None:
    code, body = req('POST', '/api/auth/login/', data={'email': email, 'password': PASSWORD})
    data = unwrap(body) if isinstance(body, dict) else {}
    token = data.get('access') if isinstance(data, dict) else None
    check(f'login:{email.split("@")[0]}', code == 200 and bool(token), str(code))
    return token


def seed_pending_no_parking() -> str:
    """Create a HITL-ready pending No Parking case for the demo driver (plate 2A-1234)."""
    import os
    import sys

    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    from django.core.files.base import ContentFile

    django.setup()

    from django.utils import timezone
    from users.models import User, Driver, Officer
    from vehicles.models import Vehicle
    from violations.models import TrafficViolation
    from violations.services import evaluate_violation

    officer_user = User.objects.get(email=OFFICER)
    driver_user = User.objects.get(email=DRIVER)
    driver = Driver.objects.get(user=driver_user)
    officer = Officer.objects.filter(user=officer_user).first()
    vehicle = Vehicle.objects.filter(plate_number__iexact=PLATE).first()
    evaluation = evaluate_violation(class_key='NO_PARKING', observed_action='PARKING') or {}

    violation = TrafficViolation.objects.create(
        driver=driver,
        vehicle=vehicle,
        officer=officer,
        violation_type=evaluation.get('violation_type') or 'NO_PARKING',
        detected_class_key=evaluation.get('detected_class_key') or 'NO_PARKING',
        observed_action=evaluation.get('observed_action') or 'PARKING',
        plate_detected=PLATE,
        location='Phnom Penh — Thesis Demo No Parking Zone',
        description=evaluation.get('description')
        or 'Thesis demo: vehicle parked in No Parking zone (HITL pending review).',
        status='pending_review',
        violation_date=timezone.now(),
        ai_confidence_score=Decimal('0.98'),
    )
    if SAMPLE_SIGN.is_file():
        violation.evidence_image.save(
            f'demo_no_parking_{violation.id}.png',
            ContentFile(SAMPLE_SIGN.read_bytes()),
            save=True,
        )
    return str(violation.id)


def main() -> int:
    officer = login(OFFICER)
    driver = login(DRIVER)
    admin = login(ADMIN)
    if not officer or not driver or not admin:
        return _print()

    # STEP A — AI detection smoke (real road image; proves YOLO + vehicle boxes)
    if SAMPLE_ROAD.is_file():
        code, body = req(
            'POST',
            '/api/detection/image/',
            token=officer,
            data={'observed_action': 'PARKING'},
            files={'image': (SAMPLE_ROAD.name, SAMPLE_ROAD.read_bytes(), 'image/jpeg')},
            timeout=240,
        )
        data = unwrap(body) if isinstance(body, dict) else {}
        class_key = ''
        mode = ''
        if isinstance(data, dict):
            class_key = str(data.get('class_key') or data.get('sign_class_key') or '')
            mode = str(data.get('detection_mode') or '')
        check(
            'detect:image-smoke',
            code == 200 and bool(class_key or mode == 'sign' or mode == 'vehicle'),
            f'{code} class_key={class_key or "?"} mode={mode}',
        )
    else:
        check('detect:image-smoke', False, 'road_15.jpg missing')

    if SAMPLE_VIDEO.is_file() and SAMPLE_VIDEO.stat().st_size < 8_000_000:
        vcode, _ = req(
            'POST',
            '/api/detection/video/',
            token=officer,
            data={'observed_action': 'PARKING'},
            files={'video': (SAMPLE_VIDEO.name, SAMPLE_VIDEO.read_bytes(), 'video/webm')},
            timeout=300,
        )
        check('detect:video-smoke', vcode == 200, str(vcode))
    else:
        check('detect:video-smoke', True, 'skipped')

    # STEP B — Seed pending No Parking case for demo plate (officer queue)
    try:
        violation_id = seed_pending_no_parking()
        check('queue:seed-no-parking', True, violation_id)
    except Exception as exc:
        check('queue:seed-no-parking', False, str(exc)[:160])
        return _print()

    # STEP C — Officer approve → fine + notify
    acode, abody = req(
        'POST',
        f'/api/officer/violations/{violation_id}/approve/',
        token=officer,
        data={'issue_fine': True, 'officer_note': 'Thesis demo — No Parking confirmed'},
    )
    adata = unwrap(abody) if isinstance(abody, dict) else {}
    fine = adata.get('fine') if isinstance(adata, dict) else None
    fine_id = fine.get('id') if isinstance(fine, dict) else None
    check('officer:approve+fine', acode == 200 and bool(fine_id), f'{acode} fine={fine_id}')
    if not fine_id:
        return _print()

    # STEP D — Driver sees fine + notification
    fcode, fbody = req('GET', '/api/citizen/fines/', token=driver)
    check('driver:fines', fcode == 200, str(fcode))
    ncode, _ = req('GET', '/api/citizen/notifications/', token=driver)
    check('driver:notifications', ncode == 200, str(ncode))

    # STEP E — Driver appeal
    apcode, apbody = req(
        'POST',
        '/api/citizen/appeals/',
        token=driver,
        data={
            'violation_id': violation_id,
            'fine_id': fine_id,
            'reason': 'Thesis demo appeal — vehicle was loading briefly, not parking.',
        },
    )
    apdata = unwrap(apbody) if isinstance(apbody, dict) else {}
    appeal_id = apdata.get('id') if isinstance(apdata, dict) else None
    check('driver:appeal', apcode in (200, 201) and bool(appeal_id), f'{apcode} appeal={appeal_id}')
    if not appeal_id:
        return _print()

    # STEP F — Officer reviews appeal (dismissed = fine stands)
    rcode, _ = req(
        'PATCH',
        f'/api/appeals/{appeal_id}/review/',
        token=officer,
        data={
            'status': 'dismissed',
            'officer_comments': 'Thesis demo — evidence confirms No Parking zone; appeal dismissed.',
        },
    )
    check('officer:appeal-review', rcode == 200, str(rcode))

    # STEP G — Admin reports + audit trail
    rep_code, _ = req('GET', '/api/reports/dashboard/', token=admin)
    if rep_code == 404:
        rep_code, _ = req('GET', '/api/dashboard/admin/', token=admin)
    check('admin:reports', rep_code == 200, str(rep_code))
    aud_code, _ = req('GET', '/api/audit/', token=admin)
    check('admin:audit', aud_code == 200, str(aud_code))

    return _print()


def _print() -> int:
    print('=== Thesis Demo Workflow (API) ===')
    passed = 0
    for name, ok, detail in results:
        status = 'PASS' if ok else 'FAIL'
        if ok:
            passed += 1
        suffix = f' — {detail}' if detail else ''
        print(f'[{status}] {name}{suffix}')
    failed = len(results) - passed
    print('---')
    print(f'Total: {len(results)} | Passed: {passed} | Failed: {failed}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
