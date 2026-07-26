"""Scheduling models — templates, scheduled notifications, scheduled reports."""
from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel


class NotificationTemplate(TimeStampedUUIDModel):
    """Reusable notification body for admin broadcasts / schedules."""

    CHANNEL_CHOICES = [
        ('system', 'In-app'),
        ('email', 'Email'),
        ('push', 'Push'),
        ('sms', 'SMS'),
    ]

    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(max_length=20, default='system')
    channels = models.JSONField(default=list, blank=True)  # e.g. ["system","email"]
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_templates_created',
    )

    class Meta:
        db_table = 'notification_templates'
        ordering = ['slug']

    def __str__(self):
        return self.slug


class ScheduledNotification(TimeStampedUUIDModel):
    """Celery-beat polled notification job."""

    FREQUENCY_CHOICES = [
        ('once', 'Once'),
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]
    RECIPIENT_CHOICES = [
        ('driver', 'Drivers'),
        ('officer', 'Officers'),
        ('admin', 'Admins'),
        ('all', 'All users'),
    ]

    name = models.CharField(max_length=150)
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.CASCADE,
        related_name='schedules',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255, blank=True)
    message = models.TextField(blank=True)
    recipient_role = models.CharField(max_length=20, choices=RECIPIENT_CHOICES, default='all')
    channels = models.JSONField(default=list, blank=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once')
    run_at = models.DateTimeField(help_text='Next (or only) run time')
    enabled = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=40, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_notifications_created',
    )

    class Meta:
        db_table = 'scheduled_notifications'
        ordering = ['run_at']
        indexes = [
            models.Index(fields=['enabled', 'run_at'], name='idx_sched_notif_due'),
        ]

    def __str__(self):
        return self.name


class ScheduledReport(TimeStampedUUIDModel):
    """Scheduled PDF/CSV enforcement report delivery."""

    REPORT_TYPE_CHOICES = [
        ('enforcement_summary', 'Enforcement summary'),
        ('fines_monthly', 'Fines monthly'),
        ('violations_monthly', 'Violations monthly'),
    ]
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
        ('xlsx', 'Excel'),
    ]
    FREQUENCY_CHOICES = [
        ('once', 'Once'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    name = models.CharField(max_length=150)
    report_type = models.CharField(max_length=40, choices=REPORT_TYPE_CHOICES, default='enforcement_summary')
    export_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='daily')
    recipient_emails = models.JSONField(default=list, blank=True)
    run_at = models.DateTimeField()
    enabled = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=40, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_reports_created',
    )

    class Meta:
        db_table = 'scheduled_reports'
        ordering = ['run_at']
        indexes = [
            models.Index(fields=['enabled', 'run_at'], name='idx_sched_report_due'),
        ]

    def __str__(self):
        return self.name
