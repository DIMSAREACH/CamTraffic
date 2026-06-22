from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel
from users.models import Driver


class ViolationAppeal(UUIDPrimaryKeyModel):
    """Citizen dispute ticket — PRD table `violation_appeals`."""

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('upheld', 'Upheld'),
        ('dismissed', 'Dismissed'),
    ]

    violation = models.ForeignKey(
        'violations.TrafficViolation',
        on_delete=models.CASCADE,
        related_name='appeals',
    )
    fine = models.ForeignKey(
        'fines.Fine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appeals',
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='appeals',
    )
    reason = models.TextField()
    evidence_image = models.ImageField(upload_to='appeals/evidence/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    review_date = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appeals_reviewed',
    )
    officer_comments = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'violation_appeals'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status', '-submitted_at'], name='idx_appeal_status_submitted'),
            models.Index(fields=['driver', 'status'], name='idx_appeal_driver_status'),
            models.Index(fields=['violation'], name='idx_appeal_violation'),
        ]

    def __str__(self):
        return f'Appeal #{self.id} · violation {self.violation_id} · {self.status}'
