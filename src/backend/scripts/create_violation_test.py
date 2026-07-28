#!/usr/bin/env python3
"""Test script: login and create a violation via the API."""
import sys
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = 'http://localhost:8000'
LOGIN_URL = BASE + '/api/auth/login/'
DRIVERS_URL = BASE + '/api/drivers/'
VIOLATIONS_URL = BASE + '/api/violations/'
AI_LOGS_URL = BASE + '/api/ai/logs/'

def post_json(url, data, headers=None):
    body = json.dumps(data).encode('utf-8')
    hdrs = {'Content-Type': 'application/json'}
    # Ask the server for JSON errors when possible
    hdrs['Accept'] = 'application/json'
    if headers:
        hdrs.update(headers)
    req = Request(url, data=body, headers=hdrs, method='POST')
    try:
        res = urlopen(req)
        return json.load(res)
    except HTTPError as e:
        # Print raw response body for debugging
        try:
            body = e.read()
            print('HTTPError', e.code, body.decode('utf-8', errors='replace'), file=sys.stderr)
        except Exception:
            print('HTTPError', e.code, '(<no body>)', file=sys.stderr)
        raise

def get_json(url, token=None):
    hdrs = {}
    if token:
        hdrs['Authorization'] = f'Bearer {token}'
    hdrs['Accept'] = 'application/json'
    req = Request(url, headers=hdrs)
    res = urlopen(req)
    return json.load(res)

def main():
    # Credentials for demo officer
    email = 'officer@camtraffic.demo'
    password = 'CamTraffic@2026!'

    print('Logging in...')
    auth = post_json(LOGIN_URL, {'email': email, 'password': password})
    access = auth.get('data', {}).get('access') if isinstance(auth, dict) else None
    if not access:
        print('Login failed:', auth)
        return
    print('Logged in, token received')

    print('Listing drivers...')
    drivers = get_json(DRIVERS_URL, token=access)
    if not drivers or not isinstance(drivers, dict):
        print('No drivers response:', drivers)
        return
    # drivers endpoint returns data in 'data' key
    driver_list = drivers.get('data') or drivers
    if not driver_list:
        print('No drivers found')
        return
    driver = driver_list[0]
    driver_id = driver.get('id') or driver.get('driver_id') or driver.get('pk')
    print('Using driver id:', driver_id)

    payload = {
        'driver_id': driver_id,
        'class_key': 'NO_U_TURN',
        'observed_action': 'U_TURN',
        'sign_code': 'R1_03',
        'location': 'Automated test location',
        'status': 'pending_review',
    }
    print('Creating violation...')
    headers = {'Authorization': f'Bearer {access}'}
    # Try to attach the latest AI detection log if available
    try:
        logs = get_json(AI_LOGS_URL, token=access)
        log_list = logs.get('data') or logs
        if log_list:
            latest = log_list[0]
            ai_id = latest.get('id') or latest.get('pk')
            # prefer detected_class_key from log
            class_key = latest.get('detected_class_key') or latest.get('detected_class')
            plate = latest.get('plate') or latest.get('detected_plate')
            if ai_id:
                payload['ai_detection_log_id'] = ai_id
            if class_key:
                payload['class_key'] = class_key
            if plate and not payload.get('vehicle_id'):
                payload['plate'] = plate
    except Exception:
        pass

    # map common sign classes to observed actions when possible
    mapping = {
        'NO_U_TURN': 'U_TURN',
        'NO_LEFT_TURN': 'LEFT_TURN',
        'NO_RIGHT_TURN': 'RIGHT_TURN',
        'STOP': 'STOP',
    }
    payload['observed_action'] = mapping.get(payload.get('class_key'), payload.get('observed_action'))

    res = post_json(VIOLATIONS_URL, payload, headers=headers)
    print('Response:', json.dumps(res, indent=2))

if __name__ == '__main__':
    main()
