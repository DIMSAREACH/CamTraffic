from django.conf import settings
from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class Vehicle(TimeStampedModel, ActiveModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
    )
    plate_number = models.CharField(max_length=20, unique=True)
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.PositiveSmallIntegerField()
    color = models.CharField(max_length=30, blank=True)
    registration_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'vehicles_vehicle'
        ordering = ['plate_number']

    def __str__(self) -> str:
        return self.plate_number
