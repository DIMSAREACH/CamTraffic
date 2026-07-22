#!/usr/bin/env python3
"""Login as demo officer and PATCH an AI detection review."""
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = 'http://localhost:8000'
LOGIN_URL = BASE + '/api/auth/login/'
REVIEW_URL = BASE + '/api/ai/logs/cb027c14-99d4-4aec-aad3-6763ae6dd715/review/'


def post_json(url, data, headers=None):
    body = json.dumps(data).encode('utf-8')
    hdrs = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    if headers:
        hdrs.update(headers)
    req = Request(url, data=body, headers=hdrs, method='POST')
    try:
        res = urlopen(req, timeout=10)
        return json.load(res)
    except HTTPError as e:
        try:
            body = e.read().decode('utf-8', errors='replace')
            print('HTTPError', e.code, body, file=sys.stderr)
        except Exception:
            print('HTTPError', e.code, '(<no body>)', file=sys.stderr)
        raise


def patch_json(url, data, token):
    body = json.dumps(data).encode('utf-8')
    hdrs = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': f'Bearer {token}'}
    req = Request(url, data=body, headers=hdrs, method='PATCH')
    try:
        res = urlopen(req, timeout=10)
        return json.load(res)
    except HTTPError as e:
        try:
            body = e.read().decode('utf-8', errors='replace')
            print('HTTPError', e.code, body, file=sys.stderr)
        except Exception:
            print('HTTPError', e.code, '(<no body>)', file=sys.stderr)
        raise


def main():
    email = 'officer@camtraffic.demo'
    password = 'CamTraffic@2026!'
    print('Logging in...')
    auth = post_json(LOGIN_URL, {'email': email, 'password': password})
    access = auth.get('data', {}).get('access') if isinstance(auth, dict) else None
    if not access:
        print('Login failed:', auth)
        return
    print('Logged in, token received')
    print('Sending PATCH review...')
    try:
        res = patch_json(REVIEW_URL, {'review_status': 'approved'}, access)
        print('Response:', json.dumps(res, indent=2))
    except Exception as e:
        print('Patch failed:', e)

if __name__ == '__main__':
    main()
