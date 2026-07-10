from django.db import models

from apps.core.models import TimeStampedModel


class SystemSetting(TimeStampedModel):
    class ValueType(models.TextChoices):
        STRING = 'string', 'String'
        INTEGER = 'integer', 'Integer'
        BOOLEAN = 'boolean', 'Boolean'
        JSON = 'json', 'JSON'

    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    value_type = models.CharField(max_length=20, choices=ValueType.choices, default=ValueType.STRING)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)

    class Meta:
        db_table = 'system_setting'
        ordering = ['key']

    def __str__(self) -> str:
        return self.key


class BackupRecord(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'system_backup'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return self.filename
