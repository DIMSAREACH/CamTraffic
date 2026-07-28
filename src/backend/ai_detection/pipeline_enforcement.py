"""Violation evaluation and evidence linking for the full detection pipeline."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from violations.models import TrafficViolation, ViolationRule
from violations.services import create_violation_record, evaluate_violation, normalize_token

logger = logging.getLogger(__name__)


def demo_violation_enabled() -> bool:
    return getattr(settings, 'AI_PIPELINE_DEMO_VIOLATION', False)


def auto_create_violation_enabled() -> bool:
    return getattr(settings, 'AI_PIPELINE_AUTO_CREATE_VIOLATION', True)


def violation_dedup_seconds() -> int:
    return max(0, int(getattr(settings, 'AI_VIOLATION_DEDUP_SECONDS', 120)))


def infer_demo_observed_action(class_key: str) -> str | None:
    """Return the primary prohibited action for a detected sign."""
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
    """
    Prefer an explicit officer action; otherwise auto-match from the sign's
    active ViolationRule (e.g. NO_ENTRY → ENTER).
    """
    del demo_mode  # API compat; auto-match is always on when action omitted
    explicit = normalize_token(observed_action)
    if explicit:
        return explicit
    return normalize_token(infer_demo_observed_action(class_key) or '')


def resolve_driver(*, driver_id=None, plate_result: dict | None = None):
    from users.models import Driver
    from vehicles.models import Vehicle

    if driver_id:
        try:
            return Driver.objects.select_related('user').get(pk=driver_id)
        except (Driver.DoesNotExist, TypeError, ValueError):
            return None

    matched = (plate_result or {}).get('matched_vehicle') or {}
    vehicle_pk = matched.get('id')
    plate_text = (
        (plate_result or {}).get('plate_text')
        or (plate_result or {}).get('plate')
        or matched.get('plate_number')
        or ''
    )
    if not vehicle_pk and not plate_text:
        return None

    vehicle = None
    if vehicle_pk:
        vehicle = (
            Vehicle.objects.select_related('driver', 'driver__user', 'owner')
            .filter(pk=vehicle_pk)
            .first()
        )
    if not vehicle and plate_text:
        vehicle = (
            Vehicle.objects.select_related('driver', 'driver__user', 'owner')
            .filter(plate_number__iexact=str(plate_text).strip())
            .first()
        )
    if not vehicle and plate_text:
        compact = ''.join(ch for ch in str(plate_text).upper() if ch.isalnum())
        if len(compact) >= 5:
            for cand in Vehicle.objects.select_related('driver', 'driver__user', 'owner').exclude(plate_number='')[:800]:
                vc = ''.join(ch for ch in (cand.plate_number or '').upper() if ch.isalnum())
                if vc == compact:
                    vehicle = cand
                    break

    if not vehicle:
        return None
    if vehicle.driver_id:
        return vehicle.driver

    owner = vehicle.owner
    if owner and owner.role == 'driver':
        driver, _ = Driver.objects.get_or_create(
            user=owner,
            defaults={'license_no': owner.license_no or f'LIC-{owner.id}'},
        )
        if not vehicle.driver_id:
            vehicle.driver = driver
            vehicle.save(update_fields=['driver'])
        return driver
    return None


def resolve_vehicle(*, plate_result: dict | None = None, vehicles: list[dict] | None = None):
    from vehicles.models import Vehicle

    matched = (plate_result or {}).get('matched_vehicle') or {}
    if matched.get('id'):
        return Vehicle.objects.filter(pk=matched['id']).first()

    plate_text = (plate_result or {}).get('plate_text') or (plate_result or {}).get('plate')
    if plate_text:
        vehicle = Vehicle.objects.filter(plate_number__iexact=str(plate_text).strip()).first()
        if vehicle:
            return vehicle
        compact = ''.join(ch for ch in str(plate_text).upper() if ch.isalnum())
        if len(compact) >= 5:
            for cand in Vehicle.objects.exclude(plate_number='')[:800]:
                vc = ''.join(ch for ch in (cand.plate_number or '').upper() if ch.isalnum())
                if vc == compact:
                    return cand

    return None


def find_recent_duplicate_violation(
    *,
    driver_id,
    vehicle_id=None,
    camera_id=None,
    detected_class_key: str = '',
    observed_action: str = '',
    violation_type: str = '',
) -> TrafficViolation | None:
    """
    Suppress duplicate auto-created cases from continuous camera/webcam scans.
    Match on driver + rule (+ camera/vehicle when known) within the dedup window.
    """
    window = violation_dedup_seconds()
    if window <= 0 or not driver_id:
        return None

    since = timezone.now() - timedelta(seconds=window)
    qs = TrafficViolation.objects.filter(
        driver_id=driver_id,
        created_at__gte=since,
        status__in=('pending_review', 'draft', 'confirmed'),
    )
    action = normalize_token(observed_action)
    class_key = normalize_token(detected_class_key)
    if action:
        qs = qs.filter(observed_action__iexact=action)
    if class_key:
        qs = qs.filter(detected_class_key__iexact=class_key)
    elif violation_type:
        qs = qs.filter(violation_type=violation_type)
    if vehicle_id:
        qs = qs.filter(vehicle_id=vehicle_id)
    if camera_id:
        qs = qs.filter(camera_id=camera_id)
    return qs.order_by('-created_at').first()


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
    Evaluate violations and optionally create pending_review records with evidence.

    Status values in pipeline_enforcement.status:
      matched_only | created | already_exists | needs_driver | no_rule | no_observed_action | forbidden | error
    """
    helmet_summary = payload.get('helmet_summary') if isinstance(payload, dict) else None
    if not isinstance(helmet_summary, dict):
        helmet_summary = {}
    has_helmet_violation = bool(helmet_summary.get('has_no_helmet_violation'))

    class_key = sign_result.get('class_key') or ''
    if not class_key and has_helmet_violation:
        # Motorcycle equipment path when no traffic sign was detected.
        class_key = 'helmet'

    if not class_key:
        return {
            'violation_evaluation': {'is_violation': False, 'reason': 'no_sign_class'},
            'pipeline_enforcement': {'status': 'no_sign_class', 'auto_matched': False},
        }

    demo_flag = _truthy(_request_value(request, 'demo_violation'))
    explicit_action = str(_request_value(request, 'observed_action', '')).strip()
    observed_action = resolve_observed_action(
        class_key=class_key,
        observed_action=explicit_action,
        demo_mode=demo_flag,
    )
    # Helmet detections carry their own prohibited action.
    if class_key.lower() == 'helmet' and has_helmet_violation and not normalize_token(explicit_action):
        observed_action = 'NO_HELMET'  # normalize_token / iexact match seed `no_helmet`
    auto_matched = bool(observed_action) and not normalize_token(explicit_action)
    if not observed_action:
        return {
            'violation_evaluation': {'is_violation': False, 'reason': 'no_observed_action'},
            'pipeline_enforcement': {'status': 'no_observed_action', 'auto_matched': False},
        }

    evaluation = evaluate_violation(
        class_key=class_key,
        observed_action=observed_action,
        sign_code=sign_result.get('sign_code', ''),
    )
    # Sign present but no matching manoeuvre — still enforce helmet when detected.
    if not evaluation and has_helmet_violation and class_key.lower() != 'helmet':
        evaluation = evaluate_violation(
            class_key='helmet',
            observed_action='no_helmet',
            sign_code='',
        )
        if evaluation:
            observed_action = evaluation.get('observed_action') or 'NO_HELMET'
            auto_matched = True

    if not evaluation:
        return {
            'violation_evaluation': {'is_violation': False, 'observed_action': observed_action},
            'pipeline_enforcement': {
                'status': 'no_rule',
                'observed_action': observed_action,
                'auto_matched': auto_matched,
            },
        }

    out: dict = {
        'violation_evaluation': evaluation,
        'pipeline_enforcement': {
            'status': 'matched_only',
            'observed_action': observed_action,
            'auto_matched': auto_matched,
            'demo_mode': demo_flag or demo_violation_enabled() or auto_matched,
            'evidence_log_id': log.id,
        },
    }

    create_flag = _truthy(_request_value(request, 'create_violation'))
    auto_flag = _truthy(_request_value(request, 'auto_create_violation'))
    should_create = create_flag or (auto_flag and auto_create_violation_enabled())
    if not should_create:
        return out

    if getattr(request.user, 'role', None) not in ('police', 'admin'):
        out['violation_error'] = 'Only police or admin can create violation records'
        out['pipeline_enforcement']['status'] = 'forbidden'
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
    vehicle = resolve_vehicle(plate_result=plate_result, vehicles=vehicles)

    if not driver:
        detected_plate = (
            (plate_result or {}).get('plate_text')
            or (plate_result or {}).get('plate')
            or payload.get('detected_plate')
            or ''
        )
        if detected_plate and not (plate_result or {}).get('matched_vehicle'):
            from unknown_vehicles.services import queue_unmatched_plate_from_detection

            unknown = queue_unmatched_plate_from_detection(
                plate_detected=detected_plate,
                camera=camera,
                violation_type=evaluation.get('violation_type', ''),
                observed_action=evaluation.get('observed_action') or observed_action,
                detected_class_key=evaluation.get('detected_class_key') or class_key,
                ai_confidence_score=(
                    (plate_result or {}).get('plate_confidence')
                    or (plate_result or {}).get('confidence')
                ),
                ai_detection_log=log,
            )
            if unknown:
                out['unknown_vehicle_id'] = str(unknown.id)
                out['pipeline_enforcement']['unknown_vehicle_id'] = str(unknown.id)
        out['violation_error'] = (
            'No driver linked — open Unknown Vehicles to register/link plate, '
            'then create violation + fine'
        )
        out['pipeline_enforcement']['status'] = 'needs_driver'
        return out

    from users.models import Officer
    from violations.serializers import TrafficViolationSerializer

    duplicate = find_recent_duplicate_violation(
        driver_id=driver.id,
        vehicle_id=getattr(vehicle, 'id', None),
        camera_id=getattr(camera, 'id', None),
        detected_class_key=evaluation.get('detected_class_key') or class_key,
        observed_action=observed_action,
        violation_type=evaluation.get('violation_type', ''),
    )
    if duplicate is not None:
        out['violation'] = TrafficViolationSerializer(duplicate, context={'request': request}).data
        out['pipeline_enforcement']['status'] = 'already_exists'
        out['pipeline_enforcement']['violation_id'] = duplicate.id
        out['pipeline_enforcement']['dedup'] = True
        return out

    officer = None
    if request.user.role == 'police':
        officer, _ = Officer.objects.get_or_create(
            user=request.user,
            defaults={
                'badge_no': f'BADGE-{request.user.id}',
                'rank': 'Officer',
                'department': 'Traffic Police',
            },
        )

    location = str(_request_value(request, 'location', '')).strip()
    plate_text = str(
        (plate_result or {}).get('plate_text')
        or (plate_result or {}).get('plate')
        or payload.get('detected_plate')
        or ''
    ).strip()

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
            plate_detected=plate_text,
            status='pending_review',
        )
        out['violation'] = TrafficViolationSerializer(violation, context={'request': request}).data
        out['pipeline_enforcement']['status'] = 'created'
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
        out['pipeline_enforcement']['status'] = 'error'

    return out
