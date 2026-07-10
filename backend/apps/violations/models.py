from django.conf import settings
from django.db import models

from apps.cameras.models import Camera
from apps.core.models import TimeStampedModel
from apps.detections.models import Detection
from apps.traffic_signs.models import TrafficSign
from apps.vehicles.models import Vehicle


class Violation(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        APPEALED = 'appealed', 'Appealed'

    detection = models.OneToOneField(
        Detection,
        on_delete=models.PROTECT,
        related_name='violation',
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='violations',
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='violations',
    )
    camera = models.ForeignKey(Camera, on_delete=models.PROTECT, related_name='violations')
    traffic_sign = models.ForeignKey(
        TrafficSign,
        on_delete=models.PROTECT,
        related_name='violations',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    evidence_image = models.ImageField(upload_to='violations/', blank=True, null=True)
    detected_at = models.DateTimeField()
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_violations',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    officer_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'violations_violation'
        ordering = ['-detected_at']

    def __str__(self) -> str:
        return f'Violation {self.id} — {self.status}'
