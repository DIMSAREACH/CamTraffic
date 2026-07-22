from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel


class AIModelVersion(UUIDPrimaryKeyModel):
    """Deployed YOLO weight registry — PRD table `ai_model_versions`."""

    version = models.CharField(max_length=50, unique=True)
    model_file = models.CharField(max_length=255, help_text='Path to weights file relative to ai/weights/')
    description = models.TextField(blank=True)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_models_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_model_versions'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['is_active'], name='idx_aimodel_active'),
        ]

    def __str__(self):
        active = ' (active)' if self.is_active else ''
        return f'{self.version}{active}'
