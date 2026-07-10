from __future__ import annotations

from django.shortcuts import get_object_or_404

from apps.violations.models import Violation

from .models import Appeal


ACTIVE_APPEAL_STATUSES = (
    Appeal.Status.SUBMITTED,
    Appeal.Status.UNDER_REVIEW,
)


def driver_appealable_violations(user):
    return (
        Violation.objects.filter(driver=user, status=Violation.Status.APPROVED)
        .select_related('vehicle', 'traffic_sign', 'fine')
        .exclude(appeals__status__in=ACTIVE_APPEAL_STATUSES)
        .order_by('-detected_at')
    )


def submit_driver_appeal(user, violation_id: int, reason: str, evidence=None) -> Appeal:
    violation = get_object_or_404(
        driver_appealable_violations(user),
        id=violation_id,
    )

    if Appeal.objects.filter(violation=violation, status__in=ACTIVE_APPEAL_STATUSES).exists():
        raise ValueError('An active appeal already exists for this violation.')

    appeal = Appeal.objects.create(
        violation=violation,
        driver=user,
        reason=reason,
        evidence=evidence,
    )
    violation.status = Violation.Status.APPEALED
    violation.save(update_fields=['status', 'updated_at'])
    return appeal


def officer_station_appeals(officer):
    return Appeal.objects.filter(
        violation__camera__station_id=officer.station_id,
    ).select_related(
        'driver',
        'violation',
        'violation__vehicle',
        'violation__traffic_sign',
        'violation__camera',
        'violation__camera__station',
        'reviewed_by',
    )


def decide_officer_appeal(officer, appeal_id: int, decision: str, response: str) -> Appeal:
    appeal = officer_station_appeals(officer).filter(id=appeal_id).first()
    if appeal is None:
        raise ValueError('Appeal not found for your station.')

    if appeal.status not in (Appeal.Status.SUBMITTED, Appeal.Status.UNDER_REVIEW):
        raise ValueError('Only submitted or under-review appeals can be decided.')

    decision = decision.strip().lower()
    if decision not in ('approved', 'rejected'):
        raise ValueError('Decision must be approved or rejected.')

    from django.utils import timezone

    from apps.fines.models import Fine
    from apps.violations.models import Violation

    appeal.reviewed_by = officer.user
    appeal.reviewed_at = timezone.now()
    appeal.response = response.strip()
    appeal.status = Appeal.Status.APPROVED if decision == 'approved' else Appeal.Status.REJECTED
    appeal.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'response', 'updated_at'])

    violation = appeal.violation
    if decision == 'approved':
        violation.status = Violation.Status.REJECTED
        violation.save(update_fields=['status', 'updated_at'])
        fine = getattr(violation, 'fine', None)
        if fine is not None and fine.status != Fine.Status.PAID:
            fine.status = Fine.Status.WAIVED
            fine.save(update_fields=['status', 'updated_at'])
    else:
        violation.status = Violation.Status.APPROVED
        violation.save(update_fields=['status', 'updated_at'])

    return appeal
