from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel


class Fine(TimeStampedUUIDModel):
    """Financial penalty — PRD table `fines`."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('awaiting_verification', 'Awaiting Payment Verification'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('disputed', 'Disputed'),
        ('dismissed', 'Dismissed'),
    ]

    violation = models.OneToOneField(
        'violations.TrafficViolation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fine',
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fines_received',
    )
    police = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fines_issued',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    evidence_image = models.ImageField(upload_to='fines/evidence/', blank=True, null=True)
    location = models.CharField(max_length=255)
    vehicle_plate = models.CharField(max_length=20, blank=True)
    due_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, blank=True)
    payment_reference = models.CharField(max_length=200, blank=True)
    payment_screenshot = models.ImageField(upload_to='fines/payments/', blank=True, null=True)
    officer_note = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'fines'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at'], name='idx_fine_status_created'),
            models.Index(fields=['driver', 'status'], name='idx_fine_driver_status'),
            models.Index(fields=['violation'], name='idx_fine_violation'),
        ]

    def __str__(self):
        return f'Fine #{self.id} - {self.driver.full_name}'
