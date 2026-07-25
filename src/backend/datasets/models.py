from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel


class Dataset(TimeStampedUUIDModel):
    """Registered training dataset (filesystem path + metadata)."""

    TYPE_CHOICES = [
        ('signs', 'Traffic Signs'),
        ('vehicles', 'Vehicles'),
        ('plates', 'License Plates'),
        ('ocr', 'OCR Crops'),
        ('combined', 'Combined'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=120, unique=True)
    dataset_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='signs')
    description = models.TextField(blank=True)
    root_path = models.CharField(
        max_length=500,
        help_text='Path relative to repo root, e.g. ai/dataset_10/',
    )
    image_count = models.PositiveIntegerField(default=0)
    label_count = models.PositiveIntegerField(default=0)
    class_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='datasets_created',
    )

    class Meta:
        db_table = 'datasets'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class DatasetVersion(TimeStampedUUIDModel):
    """Version snapshot for a dataset (manifest / split reference)."""

    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='versions')
    version = models.CharField(max_length=50)
    manifest_path = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    image_count = models.PositiveIntegerField(default=0)
    is_current = models.BooleanField(default=False)

    class Meta:
        db_table = 'dataset_versions'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['dataset', 'version'], name='uniq_dataset_version'),
        ]

    def __str__(self):
        return f'{self.dataset.slug}@{self.version}'
