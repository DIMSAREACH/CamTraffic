from __future__ import annotations

import uuid
from datetime import timedelta

from django.utils import timezone

from apps.fines.models import Fine
from apps.system.models import SystemSetting

from .models import Violation


def _get_setting_value(key: str, default: str) -> str:
    try:
        return SystemSetting.objects.get(key=key).value
    except SystemSetting.DoesNotExist:
        return default


def _get_fine_due_days() -> int:
    try:
        return max(1, int(_get_setting_value('fine_due_days', '30')))
    except ValueError:
        return 30


def _generate_fine_reference(violation_id: int) -> str:
    suffix = uuid.uuid4().hex[:6].upper()
    return f'FINE-{violation_id:06d}-{suffix}'


def _ensure_pending(violation: Violation) -> None:
    if violation.status != Violation.Status.PENDING:
        raise ValueError('Only pending violations can be reviewed.')


def approve_violation(violation: Violation, officer_user, officer_notes: str = '') -> Fine | None:
    _ensure_pending(violation)
    violation.status = Violation.Status.APPROVED
    violation.reviewed_by = officer_user
    violation.reviewed_at = timezone.now()
    violation.officer_notes = officer_notes.strip()
    violation.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'officer_notes', 'updated_at'])

    existing_fine = Fine.objects.filter(violation_id=violation.id).first()
    if existing_fine is not None:
        return existing_fine

    currency = _get_setting_value('default_currency', 'KHR')
    return Fine.objects.create(
        violation=violation,
        amount=violation.traffic_sign.fine_amount,
        currency=currency,
        due_date=timezone.localdate() + timedelta(days=_get_fine_due_days()),
        reference_number=_generate_fine_reference(violation.id),
    )


def reject_violation(violation: Violation, officer_user, officer_notes: str = '') -> None:
    _ensure_pending(violation)
    violation.status = Violation.Status.REJECTED
    violation.reviewed_by = officer_user
    violation.reviewed_at = timezone.now()
    violation.officer_notes = officer_notes.strip()
    violation.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'officer_notes', 'updated_at'])
