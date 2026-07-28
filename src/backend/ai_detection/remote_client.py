"""HTTP client for the FastAPI ai-vision-service (Enterprise v2 Phase 2)."""

from __future__ import annotations

import logging
from pathlib import Path

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def vision_service_enabled() -> bool:
    url = getattr(settings, 'AI_VISION_SERVICE_URL', '') or ''
    return bool(url.strip())


def vision_service_base_url() -> str:
    return (getattr(settings, 'AI_VISION_SERVICE_URL', '') or '').rstrip('/')


def detect_via_vision_service(
    image_path: str | Path,
    *,
    camera_id: str | None = None,
    timeout: float = 120.0,
) -> dict:
    """
    POST image to ai-vision-service /api/v1/ai/detect/.
    Returns parsed JSON envelope { success, message, data }.
    Raises httpx.HTTPError on network/HTTP failures.
    """
    path = Path(image_path)
    base = vision_service_base_url()
    url = f'{base}/api/v1/ai/detect/'

    data = {}
    if camera_id:
        data['camera_id'] = camera_id

    with path.open('rb') as fh:
        files = {'image': (path.name, fh, 'application/octet-stream')}
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()


def check_vision_service_health(timeout: float = 5.0) -> dict:
    """GET /health/ready/ from ai-vision-service."""
    if not vision_service_enabled():
        return {'status': 'disabled', 'service': 'ai-vision-service'}
    base = vision_service_base_url()
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f'{base}/health/ready/')
            response.raise_for_status()
            payload = response.json()
            payload['service'] = 'ai-vision-service'
            return payload
    except Exception as exc:
        logger.warning('ai-vision-service health check failed: %s', exc)
        return {
            'status': 'unreachable',
            'service': 'ai-vision-service',
            'error': str(exc),
        }
