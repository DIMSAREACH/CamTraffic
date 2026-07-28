"""Fine-related business logic."""
from datetime import timedelta

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from notifications.services import notify_driver_fine as _notify_driver_fine


DEFAULT_FINE_DUE_DAYS = 14
CASH_PAYMENT_REFERENCE = 'CASH-IN-PERSON'


def notify_driver_fine(driver, fine):
    _notify_driver_fine(driver, fine)


def default_fine_due_date(*, days: int = DEFAULT_FINE_DUE_DAYS):
    return timezone.localdate() + timedelta(days=days)


def close_linked_violation(fine) -> bool:
    """Mark the linked violation closed after the fine is paid (workflow complete)."""
    violation = getattr(fine, 'violation', None)
    if not violation:
        return False
    if violation.status == 'closed':
        return False
    if violation.status not in ('confirmed', 'pending_review', 'draft'):
        return False
    violation.status = 'closed'
    violation.save(update_fields=['status', 'updated_at'])
    return True


@transaction.atomic
def mark_fine_paid(
    fine,
    *,
    payment_method: str = '',
    payment_reference: str = '',
    officer_note: str = '',
    close_violation: bool = True,
):
    """
    Mark fine paid and optionally close the linked violation.

    Used by KHQR confirm-success, officer verify/Mark Paid, and Stripe webhook.
    """
    updates = ['status', 'paid_at', 'updated_at']
    fine.status = 'paid'
    fine.paid_at = timezone.now()
    if payment_method:
        fine.payment_method = payment_method
        updates.append('payment_method')
    if payment_reference:
        fine.payment_reference = payment_reference
        updates.append('payment_reference')
    if officer_note:
        fine.officer_note = officer_note
        updates.append('officer_note')
    fine.save(update_fields=list(dict.fromkeys(updates)))

    closed = False
    if close_violation and fine.violation_id:
        fine = type(fine).objects.select_related('violation', 'driver', 'police').get(pk=fine.pk)
        closed = close_linked_violation(fine)

    # Alert admins + officers (best-effort; never roll back payment).
    try:
        from notifications.services import notify_staff_payment_success

        notify_staff_payment_success(fine)
    except Exception:
        import logging
        logging.getLogger(__name__).exception(
            'Staff payment notification failed for fine=%s', getattr(fine, 'pk', None),
        )

    return fine, closed


@transaction.atomic
def submit_cash_for_verification(fine, *, note: str = '') -> object:
    """Driver chose cash — wait for officer to receive and approve payment."""
    fine.payment_method = 'cash'
    fine.payment_reference = (note or '').strip() or CASH_PAYMENT_REFERENCE
    fine.status = 'awaiting_verification'
    fine.paid_at = None
    fine.save(update_fields=[
        'payment_method', 'payment_reference', 'status', 'paid_at', 'updated_at',
    ])
    return fine


def copy_violation_evidence_to_fine(fine, violation) -> bool:
    """Copy primary violation evidence onto the fine so drivers can view it on the fine record."""
    if not fine or not violation:
        return False
    if fine.evidence_image:
        return False
    src = (
        getattr(violation, 'evidence_image', None)
        or getattr(violation, 'vehicle_evidence_image', None)
        or getattr(violation, 'plate_evidence_image', None)
    )
    if not src:
        log = getattr(violation, 'ai_detection_log', None)
        if log:
            src = (
                getattr(log, 'uploaded_image', None)
                or getattr(log, 'vehicle_snapshot', None)
                or getattr(log, 'plate_snapshot', None)
            )
    if not src:
        return False
    try:
        src.open('rb')
        try:
            data = src.read()
        finally:
            src.close()
        name = (getattr(src, 'name', '') or 'evidence.jpg').split('/')[-1] or 'evidence.jpg'
        fine.evidence_image.save(name, ContentFile(data), save=True)
        return True
    except Exception:
        return False


def apply_issue_defaults(fine, violation=None):
    """Set due_date and copy evidence after Fine.objects.create."""
    updates = []
    if not fine.due_date:
        fine.due_date = default_fine_due_date()
        updates.append('due_date')
    if updates:
        fine.save(update_fields=updates)
    if violation is not None:
        copy_violation_evidence_to_fine(fine, violation)
    return fine
