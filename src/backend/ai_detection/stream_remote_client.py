"""HTTP client for stream-gateway (Enterprise v2 Phase 4)."""

from __future__ import annotations

import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def stream_gateway_enabled() -> bool:
    return bool(getattr(settings, 'STREAM_GATEWAY_URL', '').strip())


def stream_gateway_base_url() -> str:
    return getattr(settings, 'STREAM_GATEWAY_URL', '').rstrip('/')


def capture_snapshot_via_gateway(camera_id: str, rtsp_url: str = '', *, timeout: float = 20.0) -> bytes | None:
    """GET snapshot JPEG from stream-gateway."""
    base = stream_gateway_base_url()
    params = {}
    if rtsp_url:
        params['rtsp_url'] = rtsp_url
    url = f'{base}/api/v1/streams/cameras/{camera_id}/snapshot/'
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            return response.content
    except Exception as exc:
        logger.warning('stream-gateway snapshot failed for %s: %s', camera_id, exc)
        return None


def start_stream_via_gateway(
    camera_id: str,
    rtsp_url: str,
    *,
    fps: int = 5,
    timeout: float = 10.0,
) -> dict | None:
    base = stream_gateway_base_url()
    url = f'{base}/api/v1/streams/cameras/{camera_id}/start/'
    payload = {'camera_id': camera_id, 'rtsp_url': rtsp_url, 'fps': fps}
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning('stream-gateway start failed for %s: %s', camera_id, exc)
        return None


def stop_stream_via_gateway(camera_id: str, *, timeout: float = 10.0) -> dict | None:
    base = stream_gateway_base_url()
    url = f'{base}/api/v1/streams/cameras/{camera_id}/stop/'
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning('stream-gateway stop failed for %s: %s', camera_id, exc)
        return None


def get_stream_status_via_gateway(camera_id: str, *, timeout: float = 5.0) -> dict | None:
    base = stream_gateway_base_url()
    url = f'{base}/api/v1/streams/cameras/{camera_id}/status/'
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning('stream-gateway status failed for %s: %s', camera_id, exc)
        return None


def check_stream_gateway_health(timeout: float = 5.0) -> dict:
    if not stream_gateway_enabled():
        return {'status': 'disabled', 'service': 'stream-gateway'}
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f'{stream_gateway_base_url()}/health/ready/')
            response.raise_for_status()
            payload = response.json()
            payload['service'] = 'stream-gateway'
            return payload
    except Exception as exc:
        logger.warning('stream-gateway health check failed: %s', exc)
        return {'status': 'unreachable', 'service': 'stream-gateway', 'error': str(exc)}
