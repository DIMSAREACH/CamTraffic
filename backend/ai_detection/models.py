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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_detection_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.detected_sign} ({self.confidence}%)'
