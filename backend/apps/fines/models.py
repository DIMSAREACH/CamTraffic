from django.db import models

from apps.core.models import TimeStampedModel
from apps.violations.models import Violation


class Fine(TimeStampedModel):
    class Status(models.TextChoices):
        UNPAID = 'unpaid', 'Unpaid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        WAIVED = 'waived', 'Waived'

    violation = models.OneToOneField(
        Violation,
        on_delete=models.CASCADE,
        related_name='fine',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    currency = models.CharField(max_length=3, default='KHR')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    reference_number = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'fines_fine'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.reference_number} — {self.amount} {self.currency}'


class FinePayment(TimeStampedModel):
    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        BANK = 'bank', 'Bank Transfer'
        MOBILE = 'mobile', 'Mobile Payment'

    fine = models.ForeignKey(Fine, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    method = models.CharField(max_length=20, choices=Method.choices)
    transaction_id = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField()

    class Meta:
        db_table = 'fines_payment'
        ordering = ['-paid_at']

    def __str__(self) -> str:
        return f'Payment {self.transaction_id or self.id} — {self.amount}'
