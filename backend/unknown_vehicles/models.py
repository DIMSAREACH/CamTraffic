from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel
from infrastructure.models import Camera


class UnknownVehicle(UUIDPrimaryKeyModel):
    """Unmatched plate queue — PRD table `unknown_vehicles`."""

    plate_detected = models.CharField(max_length=20, db_index=True)
    camera = models.ForeignKey(
        Camera,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unknown_vehicles',
    )
    violation_type = models.CharField(max_length=30, blank=True)
    evidence_photo = models.ImageField(upload_to='unknown_vehicles/evidence/', blank=True, null=True)
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unknown_vehicles_resolved',
    )
    linked_vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unknown_vehicle_links',
    )
    linked_violation = models.ForeignKey(
        'violations.TrafficViolation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unknown_vehicle_sources',
    )
    officer_note = models.TextField(blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'unknown_vehicles'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['is_resolved', '-detected_at'], name='idx_unknown_resolved_detected'),
            models.Index(fields=['plate_detected'], name='idx_unknown_plate'),
            models.Index(fields=['camera', 'is_resolved'], name='idx_unknown_camera_resolved'),
        ]

    def __str__(self):
        return f'{self.plate_detected} · resolved={self.is_resolved}'
