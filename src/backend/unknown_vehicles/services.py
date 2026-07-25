"""Create unknown vehicle records when plates cannot be matched."""
from __future__ import annotations

from decimal import Decimal

from django.core.files.base import ContentFile

from .models import UnknownVehicle


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
    plate = str(plate_detected or '').strip().upper()
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
