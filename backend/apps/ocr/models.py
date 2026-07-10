from django.db import models

from apps.core.models import TimeStampedModel
from apps.detections.models import Detection


class OCRResult(TimeStampedModel):
    detection = models.OneToOneField(
        Detection,
        on_delete=models.CASCADE,
        related_name='ocr_result',
    )
    raw_text = models.CharField(max_length=100)
    confidence = models.FloatField()
    language = models.CharField(max_length=10, default='en')
    bounding_box = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'ocr_result'

    def __str__(self) -> str:
        return f'OCR: {self.raw_text} ({self.confidence:.0%})'
