"""Task 138 — Ingest AI pipeline results into Django backend models."""

from __future__ import annotations

import logging
from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.ai_models.models import AIModelVersion
from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.ocr.models import OCRResult
from apps.traffic_signs.models import TrafficSign

from .ai_client import AIPipelineResult

logger = logging.getLogger(__name__)


def _active_model_version() -> AIModelVersion | None:
    return (
        AIModelVersion.objects.filter(is_active=True, status=AIModelVersion.Status.READY)
        .select_related('ai_model')
        .first()
    )


def _resolve_traffic_sign(sign_code: str | None) -> TrafficSign | None:
    if not sign_code:
        return None
    return TrafficSign.objects.filter(code=sign_code).first()


def ingest_pipeline_result(
    camera: Camera,
    image_bytes: bytes,
    ai_result: AIPipelineResult,
) -> Detection | None:
    """
    Persist a single AI pipeline result as a Detection (+ OCRResult).

    Returns the created Detection, or None when there's nothing to persist
    (no detections AND no plate text).
    """
    top = ai_result.top_detection
    plate_text = ai_result.plate_text

    if top is None and not plate_text:
        logger.debug('camera=%s: no detections and no plate — skipping', camera.code)
        return None

    model_version = _active_model_version()
    traffic_sign = _resolve_traffic_sign(top.traffic_sign_code if top else None)

    bbox: dict = {}
    if top:
        b = top.bounding_box
        bbox = {'x1': b.x1, 'y1': b.y1, 'x2': b.x2, 'y2': b.y2}

    detection = Detection(
        camera=camera,
        model_version=model_version,
        traffic_sign=traffic_sign,
        confidence=top.confidence if top else 0.0,
        plate_number=plate_text,
        plate_confidence=ai_result.plate.confidence if ai_result.plate else None,
        bounding_box=bbox,
        metadata={
            'pipeline_mode': ai_result.pipeline_mode,
            'total_ms': ai_result.total_ms,
            'detection_count': len(ai_result.detections),
        },
        detected_at=timezone.now(),
    )
    detection.image.save(
        f'detection_{camera.code}_{timezone.now():%Y%m%d_%H%M%S%f}.jpg',
        ContentFile(image_bytes),
        save=False,
    )
    detection.save()

    if plate_text and ai_result.plate:
        OCRResult.objects.create(
            detection=detection,
            raw_text=plate_text,
            confidence=ai_result.plate.confidence or 0.0,
            language='en',
        )

    logger.info(
        'camera=%s detection_id=%s sign=%s plate=%s',
        camera.code,
        detection.id,
        traffic_sign.code if traffic_sign else None,
        plate_text or None,
    )
    return detection
