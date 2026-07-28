"""Traffic violation detection and record creation."""
from __future__ import annotations

import logging
import re
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .models import TrafficViolation, ViolationRule

logger = logging.getLogger(__name__)

DEFAULT_RULES: list[dict] = [
    # Amounts stored in USD; UI displays KHR (×4100). Values approximate Cambodia Land Traffic Law schedule for thesis.
    {
        'sign_class_key': 'NO_ENTRY',
        'prohibited_action': 'ENTER',
        'violation_type': 'NO_ENTRY',
        'title': 'No Entry Violation',
        'description': 'Vehicle entered a road where No Entry is posted (Cambodia traffic law).',
        'default_fine_amount': Decimal('15.00'),  # ≈ 61,500 KHR
        'demerit_points': 3,
        'legal_reference': 'Land Traffic Law — prohibited entry',
    },
    {
        'sign_class_key': 'NO_LEFT_TURN',
        'prohibited_action': 'LEFT_TURN',
        'violation_type': 'ILLEGAL_LEFT_TURN',
        'title': 'Illegal Left Turn',
        'description': 'Vehicle turned left where a No Left Turn sign is posted (Cambodia traffic law).',
        'default_fine_amount': Decimal('10.00'),  # ≈ 41,000 KHR
        'demerit_points': 2,
        'legal_reference': 'Land Traffic Law — prohibited manoeuvre',
    },
    {
        'sign_class_key': 'NO_RIGHT_TURN',
        'prohibited_action': 'RIGHT_TURN',
        'violation_type': 'ILLEGAL_RIGHT_TURN',
        'title': 'Illegal Right Turn',
        'description': 'Vehicle turned right where a No Right Turn sign is posted.',
        'default_fine_amount': Decimal('10.00'),
        'demerit_points': 2,
        'legal_reference': 'Land Traffic Law — prohibited manoeuvre',
    },
    {
        'sign_class_key': 'NO_U_TURN',
        'prohibited_action': 'U_TURN',
        'violation_type': 'ILLEGAL_U_TURN',
        'title': 'Illegal U-Turn',
        'description': 'Vehicle made a U-turn where prohibited.',
        'default_fine_amount': Decimal('12.00'),  # ≈ 49,200 KHR
        'demerit_points': 3,
        'legal_reference': 'Land Traffic Law — prohibited manoeuvre',
    },
    {
        'sign_class_key': 'NO_PARKING',
        'prohibited_action': 'PARKING',
        'violation_type': 'NO_PARKING',
        'title': 'No Parking Violation',
        'description': 'Vehicle parked where No Parking is indicated.',
        'default_fine_amount': Decimal('8.00'),  # ≈ 32,800 KHR
        'demerit_points': 1,
        'legal_reference': 'Land Traffic Law — parking restrictions',
    },
    {
        'sign_class_key': 'NO_STOPPING',
        'prohibited_action': 'STOPPING',
        'violation_type': 'NO_STOPPING',
        'title': 'No Stopping Violation',
        'description': 'Vehicle stopped where No Stopping is indicated.',
        'default_fine_amount': Decimal('8.00'),
        'demerit_points': 1,
        'legal_reference': 'Land Traffic Law — stopping restrictions',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'NO_STOPPING',
            'vehicle_action': 'STOPPING',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'STOP',
        'prohibited_action': 'CROSS',
        'violation_type': 'STOP',
        'title': 'Fail to Stop (Stop Sign)',
        'description': 'Vehicle crossed a Stop sign without stopping.',
        'default_fine_amount': Decimal('10.00'),  # ≈ 41,000 KHR
        'demerit_points': 2,
        'legal_reference': 'Land Traffic Law — Stop signs',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'STOP',
            'vehicle_action': 'CROSS',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'ROAD_CLOSED_ALL_USERS',
        'prohibited_action': 'ENTER',
        'violation_type': 'ROAD_CLOSED',
        'title': 'Road Closed Violation',
        'description': 'Vehicle entered a road closed to all users.',
        'default_fine_amount': Decimal('20.00'),  # ≈ 82,000 KHR
        'demerit_points': 4,
        'legal_reference': 'Land Traffic Law — road closure',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'ROAD_CLOSED_ALL_USERS',
            'vehicle_action': 'ENTER',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'ROAD_CLOSED_ALL_VEHICLES',
        'prohibited_action': 'ENTER',
        'violation_type': 'ROAD_CLOSED',
        'title': 'Road Closed Violation',
        'description': 'Vehicle entered a road closed to all vehicles.',
        'default_fine_amount': Decimal('20.00'),
        'demerit_points': 4,
        'legal_reference': 'Land Traffic Law — road closure',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'ROAD_CLOSED_ALL_VEHICLES',
            'vehicle_action': 'ENTER',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'TOTAL_WEIGHT_LIMIT',
        'prohibited_action': 'OVERWEIGHT',
        'violation_type': 'WEIGHT_LIMIT_VIOLATION',
        'title': 'Total Weight Limit Violation',
        'description': 'Vehicle exceeded the posted total weight limit.',
        'default_fine_amount': Decimal('50.00'),  # ≈ 205,000 KHR
        'demerit_points': 5,
        'legal_reference': 'Land Traffic Law — vehicle weight limits',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'TOTAL_WEIGHT_LIMIT',
            'vehicle_action': 'OVERWEIGHT',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'AXLE_WEIGHT_LIMIT',
        'prohibited_action': 'OVERWEIGHT',
        'violation_type': 'WEIGHT_LIMIT_VIOLATION',
        'title': 'Axle Weight Limit Violation',
        'description': 'Vehicle exceeded the posted axle weight limit.',
        'default_fine_amount': Decimal('50.00'),
        'demerit_points': 5,
        'legal_reference': 'Land Traffic Law — vehicle weight limits',
        'category': 'traffic_sign',
        'detection_type': 'fusion',
        'config': {
            'traffic_sign': 'AXLE_WEIGHT_LIMIT',
            'vehicle_action': 'OVERWEIGHT',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
    {
        'sign_class_key': 'helmet',
        'prohibited_action': 'no_helmet',
        'violation_type': 'NO_HELMET',
        'title': 'No Helmet (Motorcycle)',
        'description': 'Motorcycle rider detected without a safety helmet.',
        'default_fine_amount': Decimal('10.00'),  # ≈ 41,000 KHR
        'demerit_points': 1,
        'legal_reference': 'Land Traffic Law — Safety',
        'category': 'vehicle_equipment',
        'detection_type': 'yolo',
        'config': {
            'vehicle_type': 'motorcycle',
            'required_object': 'helmet',
            'detection_condition': 'not_detected',
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        },
    },
]


def normalize_token(value: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '_', (value or '').upper()).strip('_')


# Catalog / YOLO aliases → ViolationRule.sign_class_key (canonical).
# Detection often returns Cambodia codes (PW03-R1-04) instead of NO_ENTRY.
VIOLATION_SIGN_ALIASES: dict[str, str] = {
    # No Entry
    'PW03_R1_04': 'NO_ENTRY',
    'I_NO_ENTRY': 'NO_ENTRY',
    'NOENTRY': 'NO_ENTRY',
    'NO_ENTRY_FOR_MOTORCYCLE': 'NO_ENTRY',
    'NO_ENTRY_MOTOR_EXCEPT_MOTORCYCLE': 'NO_ENTRY',
    'NO_ENTRY_BICYCLE_MOTORCYCLE_TRICYCLE': 'NO_ENTRY',
    'NO_ENTRY_BICYCLE': 'NO_ENTRY',
    'NO_ENTRY_LARGE_BUS': 'NO_ENTRY',
    'NO_ENTRY_LARGE_TRUCK': 'NO_ENTRY',
    'NO_ENTRY_MOTOR_VEHICLES': 'NO_ENTRY',
    # Turns
    'PW03_R1_01': 'NO_LEFT_TURN',
    'PW03_R1_02': 'NO_RIGHT_TURN',
    'PW03_R1_03': 'NO_U_TURN',
    'I_NO_LEFT_TURN': 'NO_LEFT_TURN',
    'I_NO_RIGHT_TURN': 'NO_RIGHT_TURN',
    'I_NO_U_TURN': 'NO_U_TURN',
    # Parking / stopping / stop sign
    'PW03_R1_05': 'NO_PARKING',
    'PW03_R1_06': 'NO_PARKING',
    'I_NO_PARKING': 'NO_PARKING',
    'I_NO_STOPPING': 'NO_STOPPING',
    'NO_STANDING': 'NO_STOPPING',
    'W_STOP': 'STOP',
    'M_STOP': 'STOP',
    'I_STOP': 'STOP',
    # Road closed
    'ROAD_CLOSED': 'ROAD_CLOSED_ALL_USERS',
    'I_ROAD_CLOSED': 'ROAD_CLOSED_ALL_USERS',
}


def sign_class_key_candidates(class_key: str) -> list[str]:
    """Normalize YOLO/catalog keys so they match ViolationRule.sign_class_key rows."""
    primary = normalize_token(class_key)
    if not primary:
        return []
    out: list[str] = [primary]

    # i_no_u_turn / w_stop → NO_U_TURN / STOP
    stripped = re.sub(r'^[IWP]_', '', primary)
    if stripped and stripped not in out:
        out.append(stripped)
    stripped2 = re.sub(r'^(INFO|WARN|PROHIBIT)_', '', stripped or primary)
    if stripped2 and stripped2 not in out:
        out.append(stripped2)

    # Explicit catalog-code aliases (PW03_R1_04 → NO_ENTRY, etc.)
    for token in list(out):
        alias = VIOLATION_SIGN_ALIASES.get(token)
        if alias and alias not in out:
            out.append(alias)

    return out


def seed_default_rules() -> int:
    created = 0
    for row in DEFAULT_RULES:
        category = row.get('category') or (
            'vehicle_equipment' if str(row['sign_class_key']).lower() == 'helmet' else 'traffic_sign'
        )
        detection_type = row.get('detection_type') or (
            'yolo' if category == 'vehicle_equipment' else 'fusion'
        )
        config = row.get('config') or {
            'traffic_sign': row['sign_class_key'],
            'vehicle_action': row['prohibited_action'],
            'confidence_threshold': 0.85,
            'ocr_required': True,
            'police_review_required': True,
            'save_evidence': {'original': True, 'detection': True, 'plate': True, 'ai_result': True},
        }
        if category == 'vehicle_equipment' and str(row['sign_class_key']).lower() == 'helmet':
            config = {
                **config,
                'vehicle_type': 'motorcycle',
                'required_object': 'helmet',
                'detection_condition': 'not_detected',
            }
        _, was_created = ViolationRule.objects.update_or_create(
            sign_class_key=row['sign_class_key'],
            prohibited_action=row['prohibited_action'],
            defaults={
                'violation_type': row['violation_type'],
                'title': row['title'],
                'description': row['description'],
                'default_fine_amount': row['default_fine_amount'],
                'demerit_points': row.get('demerit_points', 0),
                'legal_reference': row.get('legal_reference', ''),
                'category': category,
                'detection_type': detection_type,
                'config': config,
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    return created


def evaluate_violation(
    *,
    class_key: str,
    observed_action: str,
    sign_code: str = '',
) -> dict | None:
    """
    Compare detected sign with observed vehicle action.

    Returns violation evaluation payload or None if no rule matches.
    """
    if not class_key or not observed_action:
        return None

    sign_key = normalize_token(class_key)
    action = normalize_token(observed_action)
    if not sign_key or not action:
        return None

    # Also try alias of sign_code (e.g. PW03-R1-04) when class_key is generic.
    candidates = sign_class_key_candidates(class_key)
    if sign_code:
        for extra in sign_class_key_candidates(sign_code):
            if extra not in candidates:
                candidates.append(extra)

    rule = None
    matched_key = sign_key
    for candidate in candidates:
        for cand_rule in ViolationRule.objects.filter(
            is_active=True,
            sign_class_key__iexact=candidate,
        ):
            if normalize_token(cand_rule.prohibited_action) == action:
                rule = cand_rule
                matched_key = normalize_token(cand_rule.sign_class_key) or candidate
                break
        if rule:
            break
    if not rule:
        return None

    return {
        'violation_type': rule.violation_type,
        'title': rule.title,
        'description': rule.description,
        'default_fine_amount': float(rule.default_fine_amount),
        'detected_class_key': matched_key,
        'detected_sign_code': sign_code or '',
        'observed_action': action,
        'sign_class_key': rule.sign_class_key,
        'prohibited_action': normalize_token(rule.prohibited_action) or rule.prohibited_action,
        'is_violation': True,
    }


def _copy_evidence_to_local(source_field, *, dest_dir: str, dest_name: str) -> str | None:
    """
    Copy an ImageField onto MEDIA_ROOT and return the relative name.

    Avoids FieldFile.save() when USE_S3_MEDIA is on — public R2 URLs are often 403
    in local/dev, while Django SERVE_MEDIA can still serve /media/... from disk.
    """
    if not source_field:
        return None
    src_name = (getattr(source_field, 'name', '') or '').replace('\\', '/').lstrip('/')
    if not src_name:
        return None

    from pathlib import Path
    import uuid

    from django.conf import settings

    media_root = Path(settings.MEDIA_ROOT)
    dest_rel = f"{dest_dir.strip('/')}/{dest_name}"
    dest = media_root / dest_rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    src_local = media_root / src_name
    try:
        if src_local.is_file() and src_local.stat().st_size > 0:
            if src_local.resolve() != dest.resolve():
                dest.write_bytes(src_local.read_bytes())
            return dest_rel.replace('\\', '/')
    except OSError:
        pass

    try:
        if hasattr(source_field, 'open'):
            source_field.open('rb')
        raw = source_field.read()
        if hasattr(source_field, 'seek'):
            try:
                source_field.seek(0)
            except Exception:
                pass
        if raw:
            dest.write_bytes(raw)
            return dest_rel.replace('\\', '/')
    except Exception:
        logger.exception('Failed to copy evidence locally from %s', src_name)

    return None


def create_violation_record(
    *,
    driver,
    evaluation: dict,
    location: str = '',
    officer=None,
    vehicle=None,
    camera=None,
    road=None,
    ai_detection_log=None,
    evidence_image=None,
    vehicle_evidence_image=None,
    plate_evidence_image=None,
    plate_detected: str = '',
    status: str = 'pending_review',
) -> TrafficViolation:
    """Persist a violation after evaluate_violation() returns a match."""
    import uuid

    # Prefer explicit files; otherwise copy evidence from the linked AI detection log.
    if ai_detection_log is not None:
        if not evidence_image and getattr(ai_detection_log, 'uploaded_image', None):
            evidence_image = ai_detection_log.uploaded_image
        if not vehicle_evidence_image and getattr(ai_detection_log, 'vehicle_snapshot', None):
            vehicle_evidence_image = ai_detection_log.vehicle_snapshot
        if not plate_evidence_image and getattr(ai_detection_log, 'plate_snapshot', None):
            plate_evidence_image = ai_detection_log.plate_snapshot

    plate = str(plate_detected or '').strip().upper()
    if not plate and vehicle is not None:
        plate = str(getattr(vehicle, 'plate_number', None) or '').strip().upper()
    if not plate and ai_detection_log is not None:
        plate = str(getattr(ai_detection_log, 'detected_plate', None) or '').strip().upper()
    if plate in {'N/A', 'NONE', 'NULL', '-'}:
        plate = ''

    violation = TrafficViolation.objects.create(
        driver=driver,
        vehicle=vehicle,
        officer=officer,
        camera=camera,
        road=road,
        ai_detection_log=ai_detection_log,
        violation_type=evaluation['violation_type'],
        observed_action=evaluation['observed_action'],
        detected_sign_code=evaluation.get('detected_sign_code', ''),
        detected_class_key=evaluation.get('detected_class_key', ''),
        plate_detected=plate[:20],
        violation_date=timezone.now(),
        location=location or 'Unknown',
        description=evaluation.get('description') or evaluation.get('title', ''),
        status=status,
    )

    # Persist evidence under MEDIA_ROOT (browser-loadable /media/...), not R2-only keys.
    updates: dict[str, str] = {}
    token = uuid.uuid4().hex[:10]
    if evidence_image:
        rel = _copy_evidence_to_local(
            evidence_image,
            dest_dir='violations/evidence',
            dest_name=f'evidence-{token}.jpg',
        )
        if rel:
            updates['evidence_image'] = rel
    if vehicle_evidence_image:
        rel = _copy_evidence_to_local(
            vehicle_evidence_image,
            dest_dir='violations/evidence/vehicles',
            dest_name=f'vehicle-{token}.jpg',
        )
        if rel:
            updates['vehicle_evidence_image'] = rel
    if plate_evidence_image:
        rel = _copy_evidence_to_local(
            plate_evidence_image,
            dest_dir='violations/evidence/plates',
            dest_name=f'plate-{token}.jpg',
        )
        if rel:
            updates['plate_evidence_image'] = rel
    if updates:
        TrafficViolation.objects.filter(pk=violation.pk).update(**updates)
        violation.refresh_from_db()
    return violation


def get_violation_stats():
    from django.core.cache import cache
    
    cache_key = 'violation_stats_summary'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    qs = TrafficViolation.objects.all()
    stats = {
        'total_violations': qs.count(),
        'pending_review': qs.filter(status='pending_review').count(),
        'confirmed': qs.filter(status='confirmed').count(),
        'rejected': qs.filter(status='rejected').count(),
        'by_type': [
            {'violation_type': row['violation_type'] or 'UNKNOWN', 'count': row['count']}
            for row in qs.values('violation_type').annotate(count=models.Count('id')).order_by('-count')
        ],
    }
    # Cache for 5 minutes
    cache.set(cache_key, stats, 300)
    return stats
