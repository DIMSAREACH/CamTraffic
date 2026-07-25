"""Health and monitoring helpers."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from django.conf import settings
from django.db import connection


def check_database() -> dict:
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return {'status': 'ok'}
    except Exception as exc:
        return {'status': 'error', 'detail': str(exc)}


def check_media_writable() -> dict:
    media_root = Path(getattr(settings, 'MEDIA_ROOT', settings.BASE_DIR / 'media'))
    try:
        media_root.mkdir(parents=True, exist_ok=True)
        probe = media_root / '.write_probe'
        probe.write_text('ok', encoding='utf-8')
        probe.unlink(missing_ok=True)
        return {'status': 'ok', 'path': str(media_root)}
    except Exception as exc:
        return {'status': 'error', 'detail': str(exc)}


def check_ai_weights() -> dict:
    weights = Path(settings.BASE_DIR).parent / 'ai' / 'weights' / 'best.pt'
    if weights.is_file():
        return {'status': 'ok', 'path': str(weights), 'size_mb': round(weights.stat().st_size / 1_048_576, 2)}
    return {'status': 'missing', 'path': str(weights)}


def check_ai_vision_service() -> dict:
    try:
        from ai_detection.remote_client import check_vision_service_health

        return check_vision_service_health()
    except Exception as exc:
        return {'status': 'error', 'detail': str(exc)}


def get_system_status() -> dict:
    disk = shutil.disk_usage(Path(settings.BASE_DIR).parent)
    payload = {
        'service': 'camtraffic-api',
        'python': sys.version.split()[0],
        'debug': settings.DEBUG,
        'database': check_database(),
        'media': check_media_writable(),
        'ai_weights': check_ai_weights(),
        'disk_free_gb': round(disk.free / 1_073_741_824, 2),
    }
    if getattr(settings, 'AI_VISION_SERVICE_URL', ''):
        payload['ai_vision_service'] = check_ai_vision_service()
    if getattr(settings, 'OCR_SERVICE_URL', ''):
        from ai_detection.ocr_remote_client import check_ocr_service_health

        payload['ocr_service'] = check_ocr_service_health()
    if getattr(settings, 'STREAM_GATEWAY_URL', ''):
        from ai_detection.stream_remote_client import check_stream_gateway_health

        payload['stream_gateway'] = check_stream_gateway_health()
    return payload
