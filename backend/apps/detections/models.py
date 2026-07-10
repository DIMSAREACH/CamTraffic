from django.db import models

from apps.ai_models.models import AIModelVersion
from apps.cameras.models import Camera
from apps.core.models import TimeStampedModel
from apps.traffic_signs.models import TrafficSign


class Detection(TimeStampedModel):
    camera = models.ForeignKey(Camera, on_delete=models.PROTECT, related_name='detections')
    model_version = models.ForeignKey(
        AIModelVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detections',
    )
    traffic_sign = models.ForeignKey(
        TrafficSign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detections',
    )
    confidence = models.FloatField()
    plate_number = models.CharField(max_length=20, blank=True)
    plate_confidence = models.FloatField(null=True, blank=True)
    image = models.ImageField(upload_to='detections/')
    bounding_box = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    detected_at = models.DateTimeField()

    class Meta:
        db_table = 'detections_detection'
        ordering = ['-detected_at']

    def __str__(self) -> str:
        return f'Detection {self.id} @ {self.detected_at:%Y-%m-%d %H:%M}'
