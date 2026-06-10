from django.conf import settings
from django.db import models


class AIDetectionLog(models.Model):
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
    matched_vehicle_id = models.PositiveIntegerField(null=True, blank=True)
    vehicle_snapshot = models.ImageField(upload_to='ai/evidence/vehicles/', blank=True, null=True)
    plate_snapshot = models.ImageField(upload_to='ai/evidence/plates/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_detection_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.detected_sign} ({self.confidence}%)'
