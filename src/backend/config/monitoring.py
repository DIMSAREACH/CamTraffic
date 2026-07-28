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
    # Prefer configured live model path; fall back to canonical catalog weights under AI_ROOT.
    candidates: list[Path] = []
    configured = getattr(settings, 'AI_MODEL_PATH', '') or ''
    if configured:
        candidates.append(Path(configured))
    ai_root = Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
    candidates.append(ai_root / 'weights' / 'best.pt')
    candidates.append(ai_root / 'weights' / 'best_b2_named.pt')
    candidates.append(ai_root / 'weights' / 'best_v2.pt')

    seen: set[str] = set()
    for weights in candidates:
        key = str(weights.resolve()) if weights.exists() else str(weights)
        if key in seen:
            continue
        seen.add(key)
        if weights.is_file():
            return {
                'status': 'ok',
                'path': str(weights),
                'size_mb': round(weights.stat().st_size / 1_048_576, 2),
            }
    return {'status': 'missing', 'path': str(candidates[0] if candidates else ai_root / 'weights' / 'best.pt')}


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
