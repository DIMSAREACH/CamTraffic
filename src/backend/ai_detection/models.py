from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel


class AIDetectionLog(UUIDPrimaryKeyModel):
    """AI detection session log (implementation extension)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='detection_logs',
    )
    uploaded_image = models.ImageField(upload_to='ai/uploads/')
    detected_sign = models.CharField(max_length=150)
    confidence = models.FloatField()
    description = models.TextField(blank=True)
    guidance = models.TextField(blank=True)
    processing_time = models.FloatField(default=0.0)
    review_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending',
    )
    model_version = models.CharField(max_length=50, blank=True)
    detected_vehicles = models.JSONField(default=list, blank=True)
    vehicle_count = models.PositiveIntegerField(default=0)
    detected_plate = models.CharField(max_length=30, blank=True, db_index=True)
    plate_confidence = models.FloatField(default=0.0)
    plate_type = models.CharField(max_length=20, blank=True)
    plate_ocr_details = models.JSONField(default=list, blank=True)
    matched_vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detection_matches',
    )
    vehicle_snapshot = models.ImageField(upload_to='ai/evidence/vehicles/', blank=True, null=True)
    plate_snapshot = models.ImageField(upload_to='ai/evidence/plates/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_detection_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_detection_user_created'),
            models.Index(fields=['detected_plate'], name='idx_detection_plate'),
        ]

    def __str__(self):
        return f'{self.detected_sign} ({self.confidence}%)'


class VehicleTrackingLog(UUIDPrimaryKeyModel):
    """ByteTrack IDs during live webcam sessions."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicle_tracking_logs',
    )
    detection_log = models.ForeignKey(
        AIDetectionLog,
        on_delete=models.CASCADE,
        related_name='tracking_logs',
        null=True,
        blank=True,
    )
    track_session_id = models.CharField(max_length=64, db_index=True)
    track_id = models.PositiveIntegerField()
    vehicle_type = models.CharField(max_length=20)
    confidence = models.FloatField(default=0.0)
    bbox = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicle_tracking_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['track_session_id', 'track_id'], name='idx_track_session_id'),
        ]

    def __str__(self):
        return f'Track #{self.track_id} ({self.vehicle_type})'
