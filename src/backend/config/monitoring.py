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
    from pathlib import Path as P

    model_path = P(getattr(settings, 'AI_MODEL_PATH', '') or '')
    ai_root = getattr(settings, 'AI_ROOT', None)
    if ai_root is None:
        ai_root = P(settings.BASE_DIR).parent.parent / 'ai'
    weights_dir = P(ai_root) / 'weights'
    vehicle_name = getattr(settings, 'AI_VEHICLE_MODEL', 'best_cambodia_vehicles.pt')
    plate_name = getattr(settings, 'AI_PLATE_DETECT_MODEL', 'best_cambodia_plates.pt')
    vehicle_path = weights_dir / vehicle_name
    plate_path = weights_dir / plate_name

    if not model_path.is_file():
        model_path = weights_dir / 'best.pt'

    components = {
        'signs': {
            'status': 'ok' if model_path.is_file() else 'missing',
            'path': str(model_path),
            'size_mb': round(model_path.stat().st_size / 1_048_576, 2) if model_path.is_file() else 0,
        },
        'vehicles': {
            'status': 'ok' if vehicle_path.is_file() else 'missing',
            'path': str(vehicle_path),
            'size_mb': round(vehicle_path.stat().st_size / 1_048_576, 2) if vehicle_path.is_file() else 0,
        },
        'plates': {
            'status': 'ok' if plate_path.is_file() else 'missing',
            'path': str(plate_path),
            'size_mb': round(plate_path.stat().st_size / 1_048_576, 2) if plate_path.is_file() else 0,
        },
    }
    all_ok = all(c['status'] == 'ok' for c in components.values())
    return {
        'status': 'ok' if all_ok else 'degraded',
        'ai_use_mock': bool(getattr(settings, 'AI_USE_MOCK', False)),
        'components': components,
        'path': str(model_path),
        'size_mb': components['signs']['size_mb'],
    }


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
        'ai_use_mock': bool(getattr(settings, 'AI_USE_MOCK', False)),
        'stream_mock_mode': bool(getattr(settings, 'STREAM_MOCK_MODE', False)),
        'demo_camera_frames': bool(getattr(settings, 'DEMO_CAMERA_FRAMES_ENABLED', False)),
        'disk_free_gb': round(disk.free / 1_073_741_824, 2),
    }
    try:
        from fines.payment_config import payment_config_payload
        payload['payments'] = payment_config_payload()
    except Exception as exc:
        payload['payments'] = {'status': 'error', 'detail': str(exc)}
    try:
        from notifications.channel_dispatch import channel_status
        payload['notifications'] = channel_status()
    except Exception as exc:
        payload['notifications'] = {'status': 'error', 'detail': str(exc)}
    if getattr(settings, 'AI_VISION_SERVICE_URL', ''):
        payload['ai_vision_service'] = check_ai_vision_service()
    if getattr(settings, 'OCR_SERVICE_URL', ''):
        from ai_detection.ocr_remote_client import check_ocr_service_health

        payload['ocr_service'] = check_ocr_service_health()
    if getattr(settings, 'STREAM_GATEWAY_URL', ''):
        from ai_detection.stream_remote_client import check_stream_gateway_health

        payload['stream_gateway'] = check_stream_gateway_health()
    return payload
