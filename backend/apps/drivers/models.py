from django.conf import settings
from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class Driver(TimeStampedModel, ActiveModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='driver_profile',
    )
    license_number = models.CharField(max_length=30, unique=True)
    license_class = models.CharField(max_length=20, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=30, blank=True)
    notify_email = models.BooleanField(default=True)
    notify_violations = models.BooleanField(default=True)
    notify_fines = models.BooleanField(default=True)
    notify_appeals = models.BooleanField(default=True)

    class Meta:
        db_table = 'drivers_driver'
        ordering = ['license_number']

    def __str__(self) -> str:
        return f'{self.license_number} — {self.user.get_full_name() or self.user.username}'
