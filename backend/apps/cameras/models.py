from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel
from apps.officers.models import PoliceStation


class Camera(TimeStampedModel, ActiveModel):
    class Status(models.TextChoices):
        ONLINE = 'online', 'Online'
        OFFLINE = 'offline', 'Offline'
        MAINTENANCE = 'maintenance', 'Maintenance'
        ERROR = 'error', 'Error'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    location = models.CharField(max_length=255)
    stream_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OFFLINE)
    station = models.ForeignKey(
        PoliceStation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cameras',
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_health_check = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'cameras_camera'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name
