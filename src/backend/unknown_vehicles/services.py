"""Create unknown vehicle records when plates cannot be matched."""
from __future__ import annotations

import logging
from decimal import Decimal

from django.core.files.base import ContentFile

from .models import UnknownVehicle

logger = logging.getLogger(__name__)


def _read_field_bytes(field) -> tuple[bytes | None, str]:
    """Read ImageField / FileField bytes for evidence copy."""
    if not field:
        return None, 'evidence.jpg'
    name = (getattr(field, 'name', '') or 'evidence.jpg').replace('\\', '/').split('/')[-1] or 'evidence.jpg'
    try:
        field.open('rb')
        data = field.read()
        field.close()
        return (data if data else None), name
    except Exception:
        logger.exception('Failed reading evidence field %s', name)
        return None, name


def queue_unknown_vehicle(
    *,
    plate_detected: str,
    camera=None,
    violation_type: str = '',
    observed_action: str = '',
    detected_class_key: str = '',
    evidence_bytes: bytes | None = None,
    evidence_name: str = 'evidence.jpg',
    ai_confidence_score: float | None = None,
    linked_violation=None,
    ai_detection_log=None,
) -> UnknownVehicle | None:
    plate = str(plate_detected or '').strip().upper()[:20]
    if not plate or plate in ('N/A', '—', '-', 'NONE', 'NULL', 'UNKNOWN USER'):
        plate = 'UNKNOWN'

    existing = None
    # Prefer same detection log (avoid duplicate queue from Create Violation)
    if ai_detection_log is not None:
        existing = (
            UnknownVehicle.objects.filter(
                ai_detection_log=ai_detection_log,
                is_resolved=False,
            )
            .order_by('-detected_at')
            .first()
        )
    # Real plates: merge open queue rows with the same plate
    if existing is None and plate != 'UNKNOWN':
        existing = (
            UnknownVehicle.objects.filter(
                plate_detected=plate,
                is_resolved=False,
            )
            .order_by('-detected_at')
            .first()
        )

    if existing:
        dirty = False
        if violation_type and not existing.violation_type:
            existing.violation_type = str(violation_type)[:30]
            dirty = True
        if observed_action and not getattr(existing, 'observed_action', ''):
            existing.observed_action = str(observed_action)[:50]
            dirty = True
        if detected_class_key and not getattr(existing, 'detected_class_key', ''):
            existing.detected_class_key = str(detected_class_key)[:80]
            dirty = True
        if camera and not existing.camera_id:
            existing.camera = camera
            dirty = True
        if ai_detection_log and not getattr(existing, 'ai_detection_log_id', None):
            existing.ai_detection_log = ai_detection_log
            dirty = True
        if ai_confidence_score is not None and existing.ai_confidence_score is None:
            existing.ai_confidence_score = Decimal(str(round(float(ai_confidence_score), 2)))
            dirty = True
        if evidence_bytes and not existing.evidence_photo:
            existing.evidence_photo.save(evidence_name, ContentFile(evidence_bytes), save=False)
            dirty = True
        if linked_violation and not existing.linked_violation_id:
            existing.linked_violation = linked_violation
            dirty = True
        if dirty:
            existing.save()
        return existing

    record = UnknownVehicle(
        plate_detected=plate,
        camera=camera,
        violation_type=(violation_type or '')[:30],
        observed_action=(observed_action or '')[:50],
        detected_class_key=(detected_class_key or '')[:80],
        ai_confidence_score=Decimal(str(round(float(ai_confidence_score), 2))) if ai_confidence_score is not None else None,
        linked_violation=linked_violation,
        ai_detection_log=ai_detection_log,
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
    observed_action: str = '',
    detected_class_key: str = '',
    ai_detection_log=None,
    evidence_field=None,
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

    evidence_bytes = None
    evidence_name = 'evidence.jpg'
    if evidence_field is not None:
        evidence_bytes, evidence_name = _read_field_bytes(evidence_field)
    elif ai_detection_log is not None:
        for attr in ('plate_snapshot', 'vehicle_snapshot', 'uploaded_image', 'annotated_image'):
            field = getattr(ai_detection_log, attr, None)
            if field:
                evidence_bytes, evidence_name = _read_field_bytes(field)
                if evidence_bytes:
                    break

    try:
        return queue_unknown_vehicle(
            plate_detected=plate_detected,
            camera=cam,
            violation_type=violation_type,
            observed_action=observed_action,
            detected_class_key=detected_class_key,
            ai_confidence_score=ai_confidence_score,
            evidence_bytes=evidence_bytes,
            evidence_name=evidence_name,
            ai_detection_log=ai_detection_log,
        )
    except Exception:
        logger.exception('Failed to queue unknown vehicle for plate %s', plate_detected)
        return None


def build_evaluation_for_unknown(record: UnknownVehicle) -> dict | None:
    """Rebuild rule-engine evaluation from stored unknown-vehicle fields."""
    from violations.models import ViolationRule
    from violations.services import evaluate_violation, normalize_token

    class_key = (record.detected_class_key or '').strip()
    action = (record.observed_action or '').strip()
    if class_key and action:
        evaluation = evaluate_violation(class_key=class_key, observed_action=action)
        if evaluation:
            return evaluation

    vtype = normalize_token(record.violation_type or '')
    if vtype:
        rule = (
            ViolationRule.objects.filter(is_active=True, violation_type__iexact=vtype)
            .order_by('id')
            .first()
        )
        if rule:
            return evaluate_violation(
                class_key=rule.sign_class_key,
                observed_action=rule.prohibited_action,
            )

    # Default Cambodia thesis demo path: No Entry / wrong way.
    return evaluate_violation(class_key='NO_ENTRY', observed_action='ENTER')


def create_violation_from_unknown(
    *,
    record: UnknownVehicle,
    linked_vehicle,
    officer_user,
    location: str = '',
) -> tuple[object | None, str | None]:
    """
    After identity is linked, create a pending_review violation with detection evidence.
    Returns (violation, error_message).
    """
    from users.models import Officer
    from violations.services import create_violation_record

    driver = getattr(linked_vehicle, 'driver', None)
    if driver is None:
        return None, 'Linked vehicle has no driver profile — assign a driver/owner first'

    evaluation = build_evaluation_for_unknown(record)
    if not evaluation:
        return None, 'No matching violation rule for this detection'

    officer = None
    if getattr(officer_user, 'role', None) == 'police':
        officer, _ = Officer.objects.get_or_create(
            user=officer_user,
            defaults={
                'badge_no': f'BADGE-{officer_user.id}',
                'rank': 'Officer',
                'department': 'Traffic Police',
            },
        )

    log = getattr(record, 'ai_detection_log', None)
    loc = (location or '').strip()
    if not loc and record.camera_id:
        loc = getattr(record.camera, 'name', '') or getattr(record.camera, 'location', '') or ''
    if not loc:
        loc = f'Unknown plate sighting · {record.plate_detected}'

    try:
        violation = create_violation_record(
            driver=driver,
            evaluation=evaluation,
            location=loc,
            officer=officer,
            vehicle=linked_vehicle,
            camera=record.camera,
            ai_detection_log=log,
            evidence_image=log.uploaded_image if log else (record.evidence_photo or None),
            vehicle_evidence_image=log.vehicle_snapshot if log else None,
            plate_evidence_image=log.plate_snapshot if log else None,
            plate_detected=record.plate_detected or '',
            status='pending_review',
        )
    except Exception:
        logger.exception('Failed creating violation from unknown vehicle %s', record.id)
        return None, 'Failed to create violation record'

    record.linked_violation = violation
    record.save(update_fields=['linked_violation'])

    try:
        from notifications.services import notify_driver_violation
        notify_driver_violation(driver, violation)
    except Exception:
        logger.exception('Driver notification failed for violation %s', violation.id)

    return violation, None
