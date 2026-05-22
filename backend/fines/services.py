"""Fine-related business logic."""
from django.utils import timezone

from notifications.models import Notification


def notify_driver_fine(driver, fine):
    Notification.objects.create(
        user=driver,
        title='New Fine Issued',
        message=f'A fine of ${fine.amount} USD has been issued for: {fine.reason}.',
        type='fine',
    )


def mark_fine_paid(fine):
    fine.status = 'paid'
    fine.paid_at = timezone.now()
    fine.save(update_fields=['status', 'paid_at'])
