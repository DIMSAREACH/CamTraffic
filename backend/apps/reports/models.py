from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ReportExport(TimeStampedModel):
    class Format(models.TextChoices):
        PDF = 'pdf', 'PDF'
        EXCEL = 'excel', 'Excel'
        CSV = 'csv', 'CSV'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='report_exports',
    )
    report_type = models.CharField(max_length=50)
    format = models.CharField(max_length=10, choices=Format.choices, default=Format.PDF)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    file = models.FileField(upload_to='reports/', blank=True, null=True)
    parameters = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'reports_export'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.report_type} ({self.format}) — {self.status}'
