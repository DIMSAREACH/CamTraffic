"""Traffic violation detection and record creation."""
from __future__ import annotations

import re
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .models import TrafficViolation, ViolationRule

DEFAULT_RULES: list[dict] = [
    {
        'sign_class_key': 'NO_LEFT_TURN',
        'prohibited_action': 'LEFT_TURN',
        'violation_type': 'ILLEGAL_LEFT_TURN',
        'title': 'Illegal Left Turn',
        'description': 'Vehicle turned left where a No Left Turn sign is posted.',
        'default_fine_amount': Decimal('25.00'),
    },
    {
        'sign_class_key': 'NO_RIGHT_TURN',
        'prohibited_action': 'RIGHT_TURN',
        'violation_type': 'ILLEGAL_RIGHT_TURN',
        'title': 'Illegal Right Turn',
        'description': 'Vehicle turned right where a No Right Turn sign is posted.',
        'default_fine_amount': Decimal('25.00'),
    },
    {
        'sign_class_key': 'NO_U_TURN',
        'prohibited_action': 'U_TURN',
        'violation_type': 'ILLEGAL_U_TURN',
        'title': 'Illegal U-Turn',
        'description': 'Vehicle made a U-turn where prohibited.',
        'default_fine_amount': Decimal('30.00'),
    },
    {
        'sign_class_key': 'NO_PARKING',
        'prohibited_action': 'PARKING',
        'violation_type': 'NO_PARKING',
        'title': 'No Parking Violation',
        'description': 'Vehicle parked where No Parking is indicated.',
        'default_fine_amount': Decimal('20.00'),
    },
    {
        'sign_class_key': 'NO_STOPPING',
        'prohibited_action': 'STOPPING',
        'violation_type': 'NO_STOPPING',
        'title': 'No Stopping Violation',
        'description': 'Vehicle stopped where No Stopping is indicated.',
        'default_fine_amount': Decimal('20.00'),
    },
    {
        'sign_class_key': 'ROAD_CLOSED_ALL_USERS',
        'prohibited_action': 'ENTER',
        'violation_type': 'ROAD_CLOSED',
        'title': 'Road Closed Violation',
        'description': 'Vehicle entered a road closed to all users.',
        'default_fine_amount': Decimal('50.00'),
    },
    {
        'sign_class_key': 'ROAD_CLOSED_ALL_VEHICLES',
        'prohibited_action': 'ENTER',
        'violation_type': 'ROAD_CLOSED',
        'title': 'Road Closed Violation',
        'description': 'Vehicle entered a road closed to all vehicles.',
        'default_fine_amount': Decimal('50.00'),
    },
    {
        'sign_class_key': 'TOTAL_WEIGHT_LIMIT',
        'prohibited_action': 'OVERWEIGHT',
        'violation_type': 'WEIGHT_LIMIT_VIOLATION',
        'title': 'Total Weight Limit Violation',
        'description': 'Vehicle exceeded the posted total weight limit.',
        'default_fine_amount': Decimal('75.00'),
    },
    {
        'sign_class_key': 'AXLE_WEIGHT_LIMIT',
        'prohibited_action': 'OVERWEIGHT',
        'violation_type': 'WEIGHT_LIMIT_VIOLATION',
        'title': 'Axle Weight Limit Violation',
        'description': 'Vehicle exceeded the posted axle weight limit.',
        'default_fine_amount': Decimal('75.00'),
    },
]


def normalize_token(value: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '_', (value or '').upper()).strip('_')


def seed_default_rules() -> int:
    created = 0
    for row in DEFAULT_RULES:
        _, was_created = ViolationRule.objects.update_or_create(
            sign_class_key=row['sign_class_key'],
            prohibited_action=row['prohibited_action'],
            defaults={
                'violation_type': row['violation_type'],
                'title': row['title'],
                'description': row['description'],
                'default_fine_amount': row['default_fine_amount'],
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

    rule = ViolationRule.objects.filter(
        is_active=True,
        prohibited_action=action,
        sign_class_key__iexact=sign_key,
    ).first()
    if not rule:
        return None

    return {
        'violation_type': rule.violation_type,
        'title': rule.title,
        'description': rule.description,
        'default_fine_amount': float(rule.default_fine_amount),
        'detected_class_key': sign_key,
        'detected_sign_code': sign_code or '',
        'observed_action': action,
        'sign_class_key': rule.sign_class_key,
        'prohibited_action': rule.prohibited_action,
        'is_violation': True,
    }


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
    status: str = 'pending_review',
) -> TrafficViolation:
    """Persist a violation after evaluate_violation() returns a match."""
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
        violation_date=timezone.now(),
        location=location or 'Unknown',
        description=evaluation.get('description') or evaluation.get('title', ''),
        evidence_image=evidence_image,
        vehicle_evidence_image=vehicle_evidence_image,
        plate_evidence_image=plate_evidence_image,
        status=status,
    )
    return violation


def get_violation_stats():
    qs = TrafficViolation.objects.all()
    return {
        'total_violations': qs.count(),
        'pending_review': qs.filter(status='pending_review').count(),
        'confirmed': qs.filter(status='confirmed').count(),
        'rejected': qs.filter(status='rejected').count(),
        'by_type': [
            {'violation_type': row['violation_type'] or 'UNKNOWN', 'count': row['count']}
            for row in qs.values('violation_type').annotate(count=models.Count('id')).order_by('-count')
        ],
    }
