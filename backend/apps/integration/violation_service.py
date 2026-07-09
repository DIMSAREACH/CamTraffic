"""Task 141 — Auto-create Violation when a plate is matched to a registered vehicle."""

from __future__ import annotations

import logging

from apps.detections.models import Detection
from apps.vehicles.models import Vehicle
from apps.violations.models import Violation

logger = logging.getLogger(__name__)


def auto_create_violation(
    detection: Detection,
) -> tuple[Violation | None, object | None]:
    """
    Look up the detected plate number against registered vehicles.

    Returns (violation, driver_user) if a new violation was created,
    (None, None) if no matching vehicle or violation not applicable.
    """
    plate = detection.plate_number
    if not plate:
        return None, None

    if detection.traffic_sign is None:
        return None, None

    try:
        vehicle = Vehicle.objects.select_related('owner').get(plate_number=plate)
    except Vehicle.DoesNotExist:
        logger.debug('Plate %s not found in vehicle registry — no violation created', plate)
        return None, None

    if Violation.objects.filter(detection=detection).exists():
        return Violation.objects.get(detection=detection), vehicle.owner

    violation = Violation.objects.create(
        detection=detection,
        driver=vehicle.owner,
        vehicle=vehicle,
        camera=detection.camera,
        traffic_sign=detection.traffic_sign,
        evidence_image=detection.image,
        detected_at=detection.detected_at,
    )
    logger.info(
        'Auto-violation created: violation_id=%d plate=%s sign=%s',
        violation.id,
        plate,
        detection.traffic_sign.code,
    )
    return violation, vehicle.owner
