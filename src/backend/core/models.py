"""Shared abstract model bases aligned with DATABASE_SCHEMA.md (UUID PKs)."""
import uuid

from django.db import models


class UUIDPrimaryKeyModel(models.Model):
    """PRD canonical primary key — UUID v4, non-editable."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedUUIDModel(UUIDPrimaryKeyModel):
    """UUID PK + created/updated audit timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SystemSetting(TimeStampedUUIDModel):
    """Admin-editable key/value configuration (maps to PRD system_settings)."""

    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(
        default=False,
        help_text='When true, value may be exposed to authenticated non-admin clients.',
    )

    class Meta:
        db_table = 'system_settings'
        ordering = ['key']
        verbose_name = 'system setting'
        verbose_name_plural = 'system settings'

    def __str__(self):
        return self.key
