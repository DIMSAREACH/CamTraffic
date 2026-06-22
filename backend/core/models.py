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
