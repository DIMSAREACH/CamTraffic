from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import ActiveModel, TimeStampedModel


class AIModel(TimeStampedModel, ActiveModel):
    class ModelType(models.TextChoices):
        YOLO = 'yolo', 'YOLO'
        CUSTOM = 'custom', 'Custom'

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    model_type = models.CharField(max_length=20, choices=ModelType.choices, default=ModelType.YOLO)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'ai_models_model'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class AIModelVersion(TimeStampedModel):
    class Status(models.TextChoices):
        TRAINING = 'training', 'Training'
        READY = 'ready', 'Ready'
        DEPRECATED = 'deprecated', 'Deprecated'
        FAILED = 'failed', 'Failed'

    ai_model = models.ForeignKey(AIModel, on_delete=models.CASCADE, related_name='versions')
    version = models.CharField(max_length=30)
    weights_path = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRAINING)
    accuracy = models.FloatField(null=True, blank=True)
    trained_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    training_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'ai_models_version'
        unique_together = [('ai_model', 'version')]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.ai_model.name} v{self.version}'


class AITrainingHistory(TimeStampedModel):
    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'

    model_version = models.ForeignKey(
        AIModelVersion,
        on_delete=models.CASCADE,
        related_name='training_runs',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    dataset_name = models.CharField(max_length=150)
    epochs = models.PositiveIntegerField(default=1)
    batch_size = models.PositiveIntegerField(default=16)
    learning_rate = models.FloatField(null=True, blank=True)
    final_accuracy = models.FloatField(null=True, blank=True)
    final_loss = models.FloatField(null=True, blank=True)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    log_summary = models.TextField(blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_training_runs',
    )

    class Meta:
        db_table = 'ai_models_training_history'
        ordering = ['-started_at']

    def __str__(self) -> str:
        return f'{self.model_version} training ({self.status})'
