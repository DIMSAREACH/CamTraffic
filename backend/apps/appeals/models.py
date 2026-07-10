from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.violations.models import Violation


class Appeal(TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        UNDER_REVIEW = 'under_review', 'Under Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    violation = models.ForeignKey(Violation, on_delete=models.CASCADE, related_name='appeals')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appeals',
    )
    reason = models.TextField()
    evidence = models.FileField(upload_to='appeals/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_appeals',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    response = models.TextField(blank=True)

    class Meta:
        db_table = 'appeals_appeal'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'Appeal {self.id} — {self.status}'
