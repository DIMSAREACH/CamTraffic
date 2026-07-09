"""Task 137 — HTTP client that calls the AI service pipeline."""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_AI_SERVICE_URL: str = getattr(settings, 'AI_SERVICE_URL', 'http://localhost:8001')
_DEFAULT_TIMEOUT: int = 30


@dataclass
class AIBoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float


@dataclass
class AIDetectionItem:
    class_id: int
    class_name: str
    confidence: float
    bounding_box: AIBoundingBox
    traffic_sign_code: str | None = None


@dataclass
class AIPlateResult:
    mode: str
    plate_text: str
    confidence: float | None = None


@dataclass
class AIPipelineResult:
    detections: list[AIDetectionItem] = field(default_factory=list)
    plate: AIPlateResult | None = None
    pipeline_mode: str = ''
    total_ms: float = 0.0
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def top_detection(self) -> AIDetectionItem | None:
        return self.detections[0] if self.detections else None

    @property
    def plate_text(self) -> str:
        if self.plate and self.plate.plate_text:
            return self.plate.plate_text
        return ''


def _parse_bounding_box(raw: dict) -> AIBoundingBox:
    return AIBoundingBox(
        x1=raw.get('x1', 0.0),
        y1=raw.get('y1', 0.0),
        x2=raw.get('x2', 0.0),
        y2=raw.get('y2', 0.0),
    )


def _parse_pipeline_response(data: dict) -> AIPipelineResult:
    raw_detection = data.get('detection', {})
    raw_detections = raw_detection.get('detections', [])

    detections = [
        AIDetectionItem(
            class_id=d.get('class_id', 0),
            class_name=d.get('class_name', ''),
            confidence=d.get('confidence', 0.0),
            bounding_box=_parse_bounding_box(d.get('bounding_box', {})),
            traffic_sign_code=d.get('traffic_sign_code'),
        )
        for d in raw_detections
    ]

    raw_plate = data.get('plate', {})
    plate = AIPlateResult(
        mode=raw_plate.get('mode', 'mock'),
        plate_text=raw_plate.get('plate_text', ''),
        confidence=raw_plate.get('confidence'),
    )

    timings = data.get('timings', {})
    return AIPipelineResult(
        detections=detections,
        plate=plate,
        pipeline_mode=data.get('pipeline_mode', ''),
        total_ms=timings.get('total_ms', 0.0),
        raw=data,
    )


def run_pipeline(image_bytes: bytes, camera_id: str | None = None) -> AIPipelineResult:
    """Send image bytes to the AI service and return a parsed result."""
    url = f'{_AI_SERVICE_URL.rstrip("/")}/pipeline/run'
    files = {'image': ('frame.jpg', io.BytesIO(image_bytes), 'image/jpeg')}
    data: dict[str, Any] = {'store': False}
    if camera_id is not None:
        data['camera_id'] = str(camera_id)

    try:
        response = requests.post(url, files=files, data=data, timeout=_DEFAULT_TIMEOUT)
        response.raise_for_status()
        payload = response.json()
        return _parse_pipeline_response(payload.get('data', payload))
    except requests.Timeout:
        logger.error('AI service timed out after %ds for camera_id=%s', _DEFAULT_TIMEOUT, camera_id)
        raise
    except requests.RequestException as exc:
        logger.error('AI service request failed: %s', exc)
        raise


def get_pipeline_status() -> dict[str, Any]:
    """Return the AI service pipeline status (used for health checks)."""
    url = f'{_AI_SERVICE_URL.rstrip("/")}/pipeline/status'
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        logger.warning('AI service status check failed: %s', exc)
        return {'error': str(exc), 'ready': False}
