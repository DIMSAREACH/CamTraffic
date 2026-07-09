"""Task 142 — Integration validation: end-to-end smoke test."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'backend'))

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django
django.setup()

import requests
from django.conf import settings

AI_URL = getattr(settings, 'AI_SERVICE_URL', 'http://localhost:8001')
BACKEND_URL = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')


def check(label: str, ok: bool, detail: str = '') -> bool:
    icon = '✓' if ok else '✗'
    msg = f'{icon} {label}'
    if detail:
        msg += f' — {detail}'
    print(msg)
    return ok


def test_ai_health() -> bool:
    try:
        r = requests.get(f'{AI_URL}/health', timeout=20)
        return check('AI service /health', r.status_code == 200, f'HTTP {r.status_code}')
    except Exception as exc:
        return check('AI service /health', False, str(exc))


def test_ai_pipeline_status() -> bool:
    try:
        r = requests.get(f'{AI_URL}/pipeline/status', timeout=10)
        data = r.json()
        payload = data.get('data', data)
        ready = payload.get('ready', False)
        mode = payload.get('detection_mode', '?')
        return check('AI pipeline status', r.status_code == 200, f'ready={ready} mode={mode}')
    except Exception as exc:
        return check('AI pipeline status', False, str(exc))


def test_backend_health() -> bool:
    try:
        r = requests.get(f'{BACKEND_URL}/api/v1/health/', timeout=10)
        return check('Backend /health', r.status_code == 200, f'HTTP {r.status_code}')
    except Exception as exc:
        return check('Backend /health', False, str(exc))


def test_integration_endpoint_exists() -> bool:
    try:
        r = requests.get(f'{BACKEND_URL}/api/v1/integration/ai-status/', timeout=10)
        return check(
            'Backend /integration/ai-status/ reachable',
            r.status_code in (200, 401, 403),
            f'HTTP {r.status_code}',
        )
    except Exception as exc:
        return check('Backend /integration/ai-status/ reachable', False, str(exc))


def _minimal_jpeg() -> bytes:
    """Return a 1×1 white JPEG."""
    try:
        from PIL import Image
        import io
        buf = io.BytesIO()
        Image.new('RGB', (8, 8), color=(255, 255, 255)).save(buf, format='JPEG')
        return buf.getvalue()
    except ImportError:
        import struct
        # Minimal valid JPEG 1x1 white pixel
        return (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\x1e'
            b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00'
            b'\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00'
            b'\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00'
            b'\x08\x01\x01\x00\x00?\x00\xfb\xd3\xff\xd9'
        )


def test_ai_pipeline_mock_run() -> bool:
    try:
        img = _minimal_jpeg()
        r = requests.post(
            f'{AI_URL}/pipeline/run',
            files={'image': ('test.jpg', img, 'image/jpeg')},
            data={'store': 'false'},
            timeout=30,
        )
        ok = r.status_code == 200
        if ok:
            payload = r.json()
            data = payload.get('data', payload)
            mode = data.get('pipeline_mode', '?')
            return check('AI pipeline /pipeline/run', True, f'mode={mode}')
        return check('AI pipeline /pipeline/run', False, f'HTTP {r.status_code}')
    except Exception as exc:
        return check('AI pipeline /pipeline/run', False, str(exc))


def main():
    print('=== CamTraffic Phase 11 — Integration Validation ===\n')
    results = [
        test_ai_health(),
        test_ai_pipeline_status(),
        test_backend_health(),
        test_integration_endpoint_exists(),
        test_ai_pipeline_mock_run(),
    ]
    passed = sum(results)
    total = len(results)
    print(f'\n{passed}/{total} checks passed')

    report = {
        'task': 142,
        'checks': {
            'ai_health': results[0],
            'ai_pipeline_status': results[1],
            'backend_health': results[2],
            'integration_endpoint': results[3],
            'ai_pipeline_run': results[4],
        },
        'passed': passed,
        'total': total,
        'status': 'PASSED' if passed == total else 'PARTIAL',
    }
    out = Path(__file__).parent / 'integration_validation_report.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'\nReport: {out}')

    sys.exit(0 if passed == total else 1)


if __name__ == '__main__':
    main()
