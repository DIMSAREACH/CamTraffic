from __future__ import annotations

from django.utils import timezone

from .models import Fine, FinePayment


def pay_driver_fine(fine: Fine, method: str, transaction_id: str = '') -> FinePayment:
    if fine.status not in (Fine.Status.UNPAID, Fine.Status.OVERDUE):
        raise ValueError('Only unpaid or overdue fines can be paid.')

    now = timezone.now()
    payment = FinePayment.objects.create(
        fine=fine,
        amount=fine.amount,
        method=method,
        transaction_id=transaction_id.strip(),
        paid_at=now,
    )
    fine.status = Fine.Status.PAID
    fine.paid_at = now
    fine.save(update_fields=['status', 'paid_at', 'updated_at'])
    return payment
