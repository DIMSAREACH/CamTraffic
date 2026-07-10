from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    class Locale(models.TextChoices):
        EN = 'en', 'English'
        KM = 'km', 'Khmer'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    locale = models.CharField(max_length=5, choices=Locale.choices, default=Locale.EN)
    bio = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    province = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'users_profile'

    def __str__(self) -> str:
        return f'Profile: {self.user}'
