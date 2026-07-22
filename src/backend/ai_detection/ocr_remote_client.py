"""HTTP client for ocr-service (Enterprise v2 Phase 3)."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def ocr_service_enabled() -> bool:
    return bool(getattr(settings, 'OCR_SERVICE_URL', '').strip())


def ocr_service_base_url() -> str:
    return getattr(settings, 'OCR_SERVICE_URL', '').rstrip('/')


def read_plate_via_ocr_service(
    image_path: str | Path,
    vehicles: list[dict] | None = None,
    *,
    timeout: float = 60.0,
) -> dict:
    """
    POST to ocr-service /api/v1/ocr/read-frame/.
    Returns data dict compatible with plate_ocr.recognize_plate output fields.
    """
    path = Path(image_path)
    url = f'{ocr_service_base_url()}/api/v1/ocr/read-frame/'
    vehicle_payload = []
    for vehicle in vehicles or []:
        bbox = vehicle.get('bbox') or {}
        vehicle_payload.append({'bbox': bbox, 'vehicle_type': vehicle.get('vehicle_type', '')})

    with path.open('rb') as fh:
        files = {'image': (path.name, fh, 'application/octet-stream')}
        data = {'vehicles': json.dumps(vehicle_payload)}
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, files=files, data=data)
            response.raise_for_status()
            envelope = response.json()

    if not envelope.get('success'):
        raise RuntimeError(envelope.get('message') or 'OCR service failed')
    return envelope.get('data') or {}


def map_remote_ocr_to_plate_result(data: dict) -> dict:
    """Map ocr-service response to Django plate_result dict."""
    plate_text = (data.get('plate_text') or '').strip()
    if not plate_text:
        return {
            'plate_text': '',
            'plate_confidence': 0.0,
            'plate_type': '',
            'ocr_engine': data.get('ocr_engine') or 'ocr-service',
            'raw_reads': data.get('raw_reads') or [],
            'plate_regions': data.get('plate_regions') or [],
            'plate_region_found': bool(data.get('plate_region_found')),
            'matched_vehicle': None,
        }

    confidence = float(data.get('plate_confidence') or 0)
    if confidence <= 1.0:
        confidence *= 100.0
    result = {
        'plate_text': plate_text,
        'plate_confidence': confidence,
        'plate_type': data.get('plate_type') or 'unknown',
        'ocr_engine': data.get('ocr_engine') or 'ocr-service',
        'raw_reads': data.get('raw_reads') or [],
        'plate_regions': data.get('plate_regions') or [],
        'plate_region_found': bool(data.get('plate_region_found')),
        'matched_vehicle': None,
    }
    if data.get('plate_province_code'):
        result['plate_province_code'] = data['plate_province_code']
        result['plate_province_en'] = data.get('plate_province_en', '')
        result['plate_province_km'] = data.get('plate_province_km', '')
    return result


def check_ocr_service_health(timeout: float = 5.0) -> dict:
    if not ocr_service_enabled():
        return {'status': 'disabled', 'service': 'ocr-service'}
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f'{ocr_service_base_url()}/health/ready/')
            response.raise_for_status()
            payload = response.json()
            payload['service'] = 'ocr-service'
            return payload
    except Exception as exc:
        logger.warning('ocr-service health check failed: %s', exc)
        return {'status': 'unreachable', 'service': 'ocr-service', 'error': str(exc)}
