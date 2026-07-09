"""Task 138 / 141 — Celery tasks for the end-to-end camera → AI → backend workflow."""

from __future__ import annotations

import base64
import logging

from celery import shared_task
from django.shortcuts import get_object_or_404

from apps.cameras.models import Camera

from .ai_client import run_pipeline
from .detection_service import ingest_pipeline_result
from .notification_service import notify_station_officers
from .violation_service import auto_create_violation

logger = logging.getLogger(__name__)


@shared_task(name='integration.process_camera_frame', bind=True, max_retries=2)
def process_camera_frame(self, camera_id: int, image_b64: str) -> dict:
    """
    Full end-to-end pipeline for one camera frame (Task 141):
      1. Decode image
      2. Call AI service
      3. Persist Detection + OCRResult
      4. Auto-create Violation if plate is matched to a registered vehicle
      5. Notify station officers
    """
    try:
        image_bytes = base64.b64decode(image_b64)
        camera = Camera.objects.select_related('station').get(pk=camera_id)
    except Camera.DoesNotExist:
        logger.error('Camera %d not found', camera_id)
        return {'error': f'Camera {camera_id} not found'}
    except Exception as exc:
        logger.exception('Frame decode failed for camera_id=%d', camera_id)
        raise self.retry(exc=exc, countdown=5)

    try:
        ai_result = run_pipeline(image_bytes, camera_id=str(camera_id))
    except Exception as exc:
        logger.warning('AI service call failed for camera_id=%d: %s', camera_id, exc)
        raise self.retry(exc=exc, countdown=10)

    detection = ingest_pipeline_result(camera, image_bytes, ai_result)
    if detection is None:
        return {'camera_id': camera_id, 'detection_id': None, 'skipped': True}

    violation_id = None
    driver_notified = False
    if detection.plate_number:
        violation, driver_user = auto_create_violation(detection)
        if violation:
            violation_id = violation.id
        if driver_user:
            from .notification_service import notify_driver_violation
            notify_driver_violation(detection, driver_user)
            driver_notified = True

    officers_notified = notify_station_officers(detection)

    return {
        'camera_id': camera_id,
        'detection_id': detection.id,
        'violation_id': violation_id,
        'officers_notified': officers_notified,
        'driver_notified': driver_notified,
    }


@shared_task(name='integration.bulk_camera_health_and_process')
def bulk_camera_process_latest_frame() -> dict:
    """Placeholder task — in production, iterate over active RTSP streams."""
    cameras = Camera.objects.filter(is_active=True, status=Camera.Status.ONLINE).count()
    return {'active_cameras': cameras, 'note': 'Stream processing requires RTSP integration.'}
