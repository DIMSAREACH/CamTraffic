from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedUUIDModel


class ImportJob(TimeStampedUUIDModel):
    """Admin bulk import job with validate → preview → commit workflow."""

    TYPE_CHOICES = [
        ('users', 'Users'),
        ('vehicles', 'Vehicles'),
        ('signs', 'Traffic Signs'),
        ('cameras', 'Cameras'),
        ('violations', 'Violations'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending validation'),
        ('validated', 'Validated'),
        ('committed', 'Committed'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
    ]

    import_type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    file_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='import_jobs',
    )
    total_rows = models.PositiveIntegerField(default=0)
    valid_rows = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    # Full row report after validate / commit: [{row, status, errors, data}, ...]
    rows_report = models.JSONField(default=list, blank=True)
    error_summary = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'import_jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['import_type', 'status'], name='idx_import_type_status'),
            models.Index(fields=['created_by', '-created_at'], name='idx_import_by_created'),
        ]

    def __str__(self):
        return f'{self.import_type} ({self.status}) — {self.file_name}'

    def mark_expired_if_needed(self) -> bool:
        if self.status in ('pending', 'validated') and self.expires_at and timezone.now() > self.expires_at:
            self.status = 'expired'
            self.save(update_fields=['status', 'updated_at'])
            return True
        return False
