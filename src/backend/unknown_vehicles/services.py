"""Create unknown vehicle records when plates cannot be matched."""
from __future__ import annotations

import logging
from decimal import Decimal

from django.core.files.base import ContentFile

from .models import UnknownVehicle

logger = logging.getLogger(__name__)


def queue_unknown_vehicle(
    *,
    plate_detected: str,
    camera=None,
    violation_type: str = '',
    evidence_bytes: bytes | None = None,
    evidence_name: str = 'evidence.jpg',
    ai_confidence_score: float | None = None,
    linked_violation=None,
) -> UnknownVehicle | None:
    plate = str(plate_detected or '').strip().upper()[:20]
    if not plate or plate in ('UNKNOWN', 'N/A', '—'):
        return None

    existing = UnknownVehicle.objects.filter(
        plate_detected=plate,
        is_resolved=False,
    ).order_by('-detected_at').first()
    if existing:
        return existing

    record = UnknownVehicle(
        plate_detected=plate,
        camera=camera,
        violation_type=violation_type or '',
        ai_confidence_score=Decimal(str(ai_confidence_score)) if ai_confidence_score is not None else None,
        linked_violation=linked_violation,
    )
    if evidence_bytes:
        record.evidence_photo.save(evidence_name, ContentFile(evidence_bytes), save=False)
    record.save()
    return record


def queue_unmatched_plate_from_detection(
    *,
    plate_detected: str,
    matched_vehicle=None,
    camera=None,
    camera_id=None,
    ai_confidence_score: float | None = None,
    violation_type: str = '',
) -> UnknownVehicle | None:
    """Queue registry review when OCR plate is not linked to a registered vehicle."""
    if matched_vehicle:
        return None
    cam = camera
    if cam is None and camera_id:
        try:
            from infrastructure.models import Camera

            cam = Camera.objects.filter(pk=camera_id).first()
        except (TypeError, ValueError):
            cam = None
    try:
        return queue_unknown_vehicle(
            plate_detected=plate_detected,
            camera=cam,
            violation_type=violation_type,
            ai_confidence_score=ai_confidence_score,
        )
    except Exception:
        logger.exception('Failed to queue unknown vehicle for plate %s', plate_detected)
        return None
