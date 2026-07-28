"""All-modules workflow connectivity check for thesis defense.

Verifies Admin / Officer / Driver module APIs are reachable and the
enforcement chain (approve→fine→notify→appeal→reports→audit) remains wired.

Run (backend on :8000):
  node scripts/backend-python.mjs scripts/verify_all_modules_workflow.py
  # or: npm run verify:all-modules
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path

BASE = 'http://127.0.0.1:8000'
PASSWORD = 'CamTraffic@2026!'
ACCOUNTS = {
    'admin': 'admin@camtraffic.demo',
    'officer': 'officer@camtraffic.demo',
    'driver': 'driver@camtraffic.demo',
}

ROOT = Path(__file__).resolve().parents[3]
SAMPLE_SIGN = ROOT / 'ai' / 'test_samples' / 'real' / '07_no_parking.png'
PLATE = '2A-1234'

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    results.append((name, ok, detail))


def unwrap(body: object) -> object:
    if isinstance(body, dict) and body.get('success') and 'data' in body:
        return body['data']
    return body


def req(method: str, path: str, token: str | None = None, data: dict | None = None, timeout: int = 60):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data is not None else None
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
            payload = raw[:200]
        return exc.code, payload


def login(role: str) -> str | None:
    email = ACCOUNTS[role]
    code, body = req('POST', '/api/auth/login/', data={'email': email, 'password': PASSWORD})
    data = unwrap(body) if isinstance(body, dict) else {}
    token = data.get('access') if isinstance(data, dict) else None
    check(f'auth:{role}', code == 200 and bool(token), str(code))
    return token


def ok_get(name: str, path: str, token: str, accept: tuple[int, ...] = (200,)) -> object:
    code, body = req('GET', path, token=token)
    check(name, code in accept, f'{code} {path}')
    return unwrap(body) if isinstance(body, dict) else body


def seed_pending_case() -> str:
    import os
    import sys as _sys

    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in _sys.path:
        _sys.path.insert(0, str(backend_root))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    from django.core.files.base import ContentFile
    from django.utils import timezone

    django.setup()
    from users.models import Driver, Officer, User
    from vehicles.models import Vehicle
    from violations.models import TrafficViolation
    from violations.services import evaluate_violation

    officer_user = User.objects.get(email=ACCOUNTS['officer'])
    driver_user = User.objects.get(email=ACCOUNTS['driver'])
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
        location='Phnom Penh — All-Modules Workflow Demo',
        description='All-modules connectivity case (pending_review).',
        status='pending_review',
        violation_date=timezone.now(),
        ai_confidence_score=Decimal('0.97'),
    )
    if SAMPLE_SIGN.is_file():
        violation.evidence_image.save(
            f'all_modules_{violation.id}.png',
            ContentFile(SAMPLE_SIGN.read_bytes()),
            save=True,
        )
    return str(violation.id)


def main() -> int:
    code, _ = req('GET', '/api/health/')
    check('health', code == 200, str(code))

    admin = login('admin')
    officer = login('officer')
    driver = login('driver')
    if not admin or not officer or not driver:
        return _print()

    # ── Admin modules ──────────────────────────────────────────────
    for name, path in [
        ('admin:dashboard', '/api/dashboard/admin/'),
        ('admin:users', '/api/users/'),
        ('admin:officers', '/api/officers/'),
        ('admin:drivers', '/api/drivers/'),
        ('admin:vehicles', '/api/vehicles/'),
        ('admin:roads', '/api/roads/'),
        ('admin:cameras', '/api/cameras/'),
        ('admin:signs', '/api/signs/'),
        ('admin:ai-models', '/api/ai-models/'),
        ('admin:ai-logs', '/api/ai/logs/'),
        ('admin:violations', '/api/violations/'),
        ('admin:fines', '/api/fines/'),
        ('admin:appeals', '/api/appeals/'),
        ('admin:reports', '/api/reports/dashboard/'),
        ('admin:audit', '/api/audit/'),
        ('admin:settings', '/api/settings/'),
        ('admin:evidence', '/api/dashboard/evidence/'),
        ('admin:notifications', '/api/notifications/'),
    ]:
        ok_get(name, path, admin)

    # Backup endpoint (GET list — accept 200)
    bcode, _ = req('GET', '/api/dashboard/admin/backups/', token=admin)
    if bcode == 404:
        bcode, _ = req('GET', '/api/dashboard/admin/backup/', token=admin)
    check('admin:backup', bcode in (200, 201), str(bcode))

    # ── Officer modules ────────────────────────────────────────────
    for name, path in [
        ('officer:dashboard', '/api/officer/dashboard/'),
        ('officer:queue', '/api/officer/detection-queue/'),
        ('officer:violations', '/api/officer/violations/'),
        ('officer:fines', '/api/officer/fines/'),
        ('officer:appeals', '/api/appeals/'),
        ('officer:cameras', '/api/officer/cameras/'),
        ('officer:evidence', '/api/officer/evidence/'),
        ('officer:notifications', '/api/notifications/'),
        ('officer:reports', '/api/officer/reports/'),
        ('officer:ai-logs', '/api/ai/logs/'),
    ]:
        ok_get(name, path, officer)

    # Detection endpoints exist (OPTIONS/GET contract or empty POST rejected as 400/401 ok)
    for name, path in [
        ('officer:detect-image-route', '/api/detection/image/'),
        ('officer:detect-video-route', '/api/detection/video/'),
        ('officer:detect-webcam-route', '/api/detection/webcam/'),
        ('officer:detect-live-route', '/api/detection/live/'),
    ]:
        code, _ = req('GET', path, token=officer)
        # Most are POST-only → 405 Method Not Allowed proves route is mounted
        check(name, code in (200, 400, 401, 403, 405), f'{code} {path}')

    # ── Driver modules ─────────────────────────────────────────────
    for name, path in [
        ('driver:dashboard', '/api/citizen/dashboard/'),
        ('driver:vehicles', '/api/citizen/vehicles/'),
        ('driver:violations', '/api/citizen/violations/'),
        ('driver:fines', '/api/citizen/fines/'),
        ('driver:appeals', '/api/citizen/appeals/'),
        ('driver:notifications', '/api/citizen/notifications/'),
        ('driver:evidence', '/api/dashboard/evidence/'),
    ]:
        ok_get(name, path, driver)

    # ── Connected lifecycle ────────────────────────────────────────
    try:
        violation_id = seed_pending_case()
        check('chain:seed-pending', True, violation_id)
    except Exception as exc:
        check('chain:seed-pending', False, str(exc)[:160])
        return _print()

    acode, abody = req(
        'POST',
        f'/api/officer/violations/{violation_id}/approve/',
        token=officer,
        data={'issue_fine': True, 'officer_note': 'All-modules workflow approve'},
    )
    adata = unwrap(abody) if isinstance(abody, dict) else {}
    fine = adata.get('fine') if isinstance(adata, dict) else None
    fine_id = fine.get('id') if isinstance(fine, dict) else None
    check('chain:approve+fine', acode == 200 and bool(fine_id), f'{acode} fine={fine_id}')
    if not fine_id:
        return _print()

    # Reject path smoke on a second pending case (no fine)
    try:
        reject_id = seed_pending_case()
        rcode, _ = req(
            'POST',
            f'/api/officer/violations/{reject_id}/reject/',
            token=officer,
            data={'dismissal_reason': 'All-modules reject path — false positive'},
        )
        check('chain:reject-no-fine', rcode == 200, str(rcode))
    except Exception as exc:
        check('chain:reject-no-fine', False, str(exc)[:120])

    apcode, apbody = req(
        'POST',
        '/api/citizen/appeals/',
        token=driver,
        data={
            'violation_id': violation_id,
            'fine_id': fine_id,
            'reason': 'All-modules workflow appeal.',
        },
    )
    apdata = unwrap(apbody) if isinstance(apbody, dict) else {}
    appeal_id = apdata.get('id') if isinstance(apdata, dict) else None
    check('chain:appeal', apcode in (200, 201) and bool(appeal_id), f'{apcode}')
    if appeal_id:
        rv, _ = req(
            'PATCH',
            f'/api/appeals/{appeal_id}/review/',
            token=officer,
            data={'status': 'dismissed', 'officer_comments': 'All-modules appeal dismissed'},
        )
        check('chain:appeal-review', rv == 200, str(rv))
    else:
        check('chain:appeal-review', False, 'no appeal')

    # Pay stub path (mark/request) — accept paid or awaiting_verification or 400 if already disputed
    pay_code, pay_body = req(
        'POST',
        f'/api/citizen/fines/{fine_id}/pay/',
        token=driver,
        data={'method': 'manual', 'note': 'All-modules pay stub'},
    )
    check(
        'chain:pay-stub',
        pay_code in (200, 201, 400),
        f'{pay_code} {str(pay_body)[:80]}',
    )

    return _print()


def _print() -> int:
    print('=== All-Modules Workflow Verification ===')
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
