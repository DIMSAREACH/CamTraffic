"""Violation evaluation and evidence linking for the full detection pipeline."""

from __future__ import annotations

import logging

from django.conf import settings

from violations.models import ViolationRule
from violations.services import create_violation_record, evaluate_violation, normalize_token

logger = logging.getLogger(__name__)


def demo_violation_enabled() -> bool:
    return getattr(settings, 'AI_PIPELINE_DEMO_VIOLATION', False)


def auto_create_violation_enabled() -> bool:
    return getattr(settings, 'AI_PIPELINE_AUTO_CREATE_VIOLATION', True)


def infer_demo_observed_action(class_key: str) -> str | None:
    """Return the primary prohibited action for a detected sign (defense demo)."""
    from violations.services import sign_class_key_candidates

    for sign_key in sign_class_key_candidates(class_key):
        rule = ViolationRule.objects.filter(
            is_active=True,
            sign_class_key__iexact=sign_key,
        ).order_by('id').first()
        if rule:
            return rule.prohibited_action
    return None


def resolve_observed_action(
    *,
    class_key: str,
    observed_action: str = '',
    demo_mode: bool = False,
) -> str:
    explicit = normalize_token(observed_action)
    if explicit:
        return explicit
    if demo_mode or demo_violation_enabled():
        return normalize_token(infer_demo_observed_action(class_key) or '')
    return ''


def resolve_driver(*, driver_id=None, plate_result: dict | None = None):
    from users.models import Driver
    from vehicles.models import Vehicle

    if driver_id:
        try:
            return Driver.objects.select_related('user').get(pk=int(driver_id))
        except (Driver.DoesNotExist, TypeError, ValueError):
            return None

    matched = (plate_result or {}).get('matched_vehicle') or {}
    vehicle_pk = matched.get('id')
    plate_text = (plate_result or {}).get('plate_text')
    if not vehicle_pk and not plate_text:
        return None

    vehicle = None
    if vehicle_pk:
        vehicle = (
            Vehicle.objects.select_related('driver', 'driver__user', 'owner')
            .filter(pk=vehicle_pk)
            .first()
        )
    elif plate_text:
        vehicle = (
            Vehicle.objects.select_related('driver', 'driver__user', 'owner')
            .filter(plate_number__iexact=plate_text)
            .first()
        )

    if not vehicle:
        return None
    if vehicle.driver_id:
        return vehicle.driver

    owner = vehicle.owner
    if owner and owner.role == 'driver':
        driver, _ = Driver.objects.get_or_create(
            user=owner,
            defaults={'license_no': owner.license_no or f'LIC-{owner.id:05d}'},
        )
        return driver
    return None


def resolve_vehicle(*, plate_result: dict | None = None, vehicles: list[dict] | None = None):
    from vehicles.models import Vehicle

    matched = (plate_result or {}).get('matched_vehicle') or {}
    if matched.get('id'):
        return Vehicle.objects.filter(pk=matched['id']).first()

    plate_text = (plate_result or {}).get('plate_text')
    if plate_text:
        return Vehicle.objects.filter(plate_number__iexact=plate_text).first()

    return None


def _truthy(value) -> bool:
    return str(value or '').lower() in ('1', 'true', 'yes', 'on')


def _request_value(request, key: str, default=''):
    data = getattr(request, 'data', None)
    if data is not None:
        try:
            value = data.get(key, default)
            if value not in (None, ''):
                return value
        except Exception:
            pass
    return request.POST.get(key, default)


def apply_pipeline_enforcement(
    *,
    request,
    sign_result: dict,
    plate_result: dict,
    vehicles: list[dict],
    log,
    payload: dict,
) -> dict:
    """
    Evaluate violations and optionally create enforcement records with evidence.

    Returns keys to merge into the detect API payload.
    """
    class_key = sign_result.get('class_key') or ''
    if not class_key:
        return {'violation_evaluation': {'is_violation': False, 'reason': 'no_sign_class'}}

    demo_flag = _truthy(_request_value(request, 'demo_violation'))
    observed_action = resolve_observed_action(
        class_key=class_key,
        observed_action=str(_request_value(request, 'observed_action', '')).strip(),
        demo_mode=demo_flag,
    )
    if not observed_action:
        return {'violation_evaluation': {'is_violation': False, 'reason': 'no_observed_action'}}

    evaluation = evaluate_violation(
        class_key=class_key,
        observed_action=observed_action,
        sign_code=sign_result.get('sign_code', ''),
    )
    if not evaluation:
        return {'violation_evaluation': {'is_violation': False, 'observed_action': observed_action}}

    out: dict = {
        'violation_evaluation': evaluation,
        'pipeline_enforcement': {
            'observed_action': observed_action,
            'demo_mode': demo_flag or demo_violation_enabled(),
            'evidence_log_id': log.id,
        },
    }

    create_flag = _truthy(_request_value(request, 'create_violation'))
    auto_flag = _truthy(_request_value(request, 'auto_create_violation'))
    should_create = create_flag or (auto_flag and auto_create_violation_enabled())
    if not should_create:
        return out

    if request.user.role not in ('police', 'admin'):
        out['violation_error'] = 'Only police or admin can create violation records'
        return out

    camera_id = _request_value(request, 'camera_id')
    camera = None
    if camera_id:
        try:
            from infrastructure.models import Camera
            camera = Camera.objects.filter(pk=camera_id).first()
        except (TypeError, ValueError):
            camera = None

    driver_id = _request_value(request, 'driver_id')
    driver = resolve_driver(driver_id=driver_id, plate_result=plate_result)
    if not driver:
        detected_plate = (plate_result or {}).get('plate') or payload.get('detected_plate') or ''
        if detected_plate and not (plate_result or {}).get('matched_vehicle'):
            try:
                from unknown_vehicles.services import queue_unknown_vehicle

                unknown = queue_unknown_vehicle(
                    plate_detected=detected_plate,
                    camera=camera,
                    violation_type=evaluation.get('violation_type', ''),
                    ai_confidence_score=(plate_result or {}).get('confidence'),
                )
                if unknown:
                    out['unknown_vehicle_id'] = str(unknown.id)
            except Exception:
                logger.exception('Failed to queue unknown vehicle for plate %s', detected_plate)
        out['violation_error'] = 'No driver linked — register plate in Vehicles or pass driver_id'
        return out

    from users.models import Officer
    from violations.serializers import TrafficViolationSerializer

    officer = None
    if request.user.role == 'police':
        officer, _ = Officer.objects.get_or_create(
            user=request.user,
            defaults={
                'badge_no': f'BADGE-{request.user.id:05d}',
                'rank': 'Officer',
                'department': 'Traffic Police',
            },
        )

    location = str(_request_value(request, 'location', '')).strip()
    vehicle = resolve_vehicle(plate_result=plate_result, vehicles=vehicles)

    try:
        violation = create_violation_record(
            driver=driver,
            evaluation=evaluation,
            location=location,
            officer=officer,
            vehicle=vehicle,
            camera=camera,
            ai_detection_log=log,
            evidence_image=log.uploaded_image,
            vehicle_evidence_image=log.vehicle_snapshot,
            plate_evidence_image=log.plate_snapshot,
            status='pending_review',
        )
        out['violation'] = TrafficViolationSerializer(violation, context={'request': request}).data
        out['pipeline_enforcement']['violation_id'] = violation.id
        out['pipeline_enforcement']['evidence_saved'] = bool(
            log.uploaded_image or log.plate_snapshot or log.vehicle_snapshot,
        )
        out['pipeline_enforcement']['plate_evidence_saved'] = bool(log.plate_snapshot)
        out['pipeline_enforcement']['vehicle_evidence_saved'] = bool(log.vehicle_snapshot)
        from notifications.services import notify_driver_violation

        notify_driver_violation(driver, violation)
    except Exception:
        logger.exception('Failed to create violation for log %s', log.id)
        out['violation_error'] = 'Failed to save violation record'

    return out
