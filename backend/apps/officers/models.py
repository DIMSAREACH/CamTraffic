from django.conf import settings
from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class PoliceStation(TimeStampedModel, ActiveModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    name_km = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255)
    province = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        db_table = 'officers_police_station'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class Officer(TimeStampedModel, ActiveModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='officer_profile',
    )
    station = models.ForeignKey(
        PoliceStation,
        on_delete=models.PROTECT,
        related_name='officers',
    )
    badge_number = models.CharField(max_length=30, unique=True)
    rank = models.CharField(max_length=50, blank=True)
    hire_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'officers_officer'
        ordering = ['badge_number']

    def __str__(self) -> str:
        return f'{self.badge_number} — {self.user.get_full_name() or self.user.username}'
