"""Phase 1 production-truth verification — live Django API smoke tests."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:8000'
ACCOUNTS = [
    ('admin', 'admin@camtraffic.demo', 'CamTraffic@2026!'),
    ('officer', 'officer@camtraffic.demo', 'CamTraffic@2026!'),
    ('driver', 'driver@camtraffic.demo', 'CamTraffic@2026!'),
]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    results.append((name, ok, detail))


def unwrap(body: object) -> object:
    if isinstance(body, dict) and body.get('success') and 'data' in body:
        return body['data']
    return body


def list_count(body: object) -> int | str:
    payload = unwrap(body)
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict):
        if 'results' in payload:
            return payload.get('count', len(payload['results']))
        if 'count' in payload:
            return payload['count']
    return '?'


def req(method: str, path: str, token: str | None = None, data: dict | None = None) -> tuple[int, object]:
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw[:200]
        return exc.code, payload


def main() -> int:
    code, body = req('GET', '/api/health/')
    check('health', code == 200 and isinstance(body, dict) and body.get('success'), str(code))

    tokens: dict[str, str | None] = {}
    for role, email, password in ACCOUNTS:
        code, body = req('POST', '/api/auth/login/', data={'email': email, 'password': password})
        token = None
        if isinstance(body, dict) and body.get('success'):
            token = (body.get('data') or {}).get('access')
        tokens[role] = token
        msg = body.get('message', body) if isinstance(body, dict) else body
        check(f'login:{role}', code == 200 and bool(token), f'{code} {msg}')

    for role, path in [
        ('admin', '/api/dashboard/admin/'),
        ('officer', '/api/dashboard/police/'),
        ('driver', '/api/dashboard/driver/'),
    ]:
        token = tokens.get(role)
        if not token:
            check(f'dashboard:{role}', False, 'no token')
            continue
        code, body = req('GET', path, token=token)
        data = unwrap(body)
        keys = list(data.keys())[:8] if isinstance(data, dict) else []
        ok = code == 200 and (
            (isinstance(body, dict) and body.get('success') and isinstance(data, dict))
            or (isinstance(data, dict) and data)
        )
        check(
            f'dashboard:{role}',
            ok,
            f'{code} keys={keys}',
        )

    admin = tokens.get('admin')
    if admin:
        for name, path in [
            ('users', '/api/users/'),
            ('cameras', '/api/cameras/'),
            ('fines', '/api/fines/'),
            ('appeals', '/api/appeals/'),
            ('audit', '/api/audit/'),
            ('rbac/roles', '/api/rbac/roles/'),
            ('ai-models', '/api/ai-models/'),
            ('unknown-vehicles', '/api/unknown-vehicles/'),
        ]:
            code, body = req('GET', path, token=admin)
            count = list_count(body)
            ok = code == 200 and (
                (isinstance(body, dict) and body.get('success'))
                or (isinstance(body, dict) and 'results' in body)
            )
            check(f'admin:{name}', ok, f'{code} count={count}')

        code, body = req('GET', '/api/dashboard/evidence/', token=admin)
        check(
            'admin:evidence-archive',
            code == 200 and isinstance(body, dict) and body.get('success'),
            str(code),
        )

        code, body = req('GET', '/api/users/', token=admin)
        payload = unwrap(body)
        if isinstance(payload, dict) and 'results' in payload:
            users = payload['results']
        elif isinstance(payload, list):
            users = payload
        else:
            users = []
        demo_emails = {u.get('email') for u in users if isinstance(u, dict)}
        check('seed:demo-users', 'admin@camtraffic.demo' in demo_emails, f'users={len(users)}')

    officer = tokens.get('officer')
    if officer:
        code, body = req('GET', '/api/fines/', token=officer)
        check('officer:fines', code == 200, f'{code} items={list_count(body)}')

        code, body = req('GET', '/api/dashboard/police/reports/', token=officer)
        check('officer:reports', code == 200 and body.get('success'), str(code))

    driver = tokens.get('driver')
    if driver:
        code, body = req('GET', '/api/fines/', token=driver)
        check('driver:fines', code == 200, f'{code} items={list_count(body)}')

    print('=== Phase 1 API Verification ===')
    passed = 0
    for name, ok, detail in results:
        status = 'PASS' if ok else 'FAIL'
        if ok:
            passed += 1
        suffix = f' — {detail}' if detail else ''
        print(f'[{status}] {name}{suffix}')
    print('---')
    failed = len(results) - passed
    print(f'Total: {len(results)} | Passed: {passed} | Failed: {failed}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
