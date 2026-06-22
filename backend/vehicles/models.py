from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel


class Vehicle(UUIDPrimaryKeyModel):
    """Registered vehicle — PRD table `vehicles`."""

    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('motorcycle', 'Motorcycle'),
        ('truck', 'Truck'),
        ('bus', 'Bus'),
        ('tuk-tuk', 'Tuk-Tuk'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('expired', 'Expired'),
    ]

    driver = models.ForeignKey(
        'users.Driver',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='vehicles',
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
        help_text='Denormalized user account (driver.user) for legacy queries.',
    )
    plate_number = models.CharField(max_length=20, unique=True, db_index=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES, default='car')
    make = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100)
    color = models.CharField(max_length=50)
    year = models.PositiveIntegerField(default=2020)
    engine_no = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    chassis_no = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    registration_expiry = models.DateField(null=True, blank=True)
    registration_photo = models.ImageField(upload_to='vehicles/registration/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['driver', 'status'], name='idx_vehicle_driver_status'),
            models.Index(fields=['owner'], name='idx_vehicle_owner'),
            models.Index(fields=['plate_number'], name='idx_vehicle_plate'),
        ]

    def __str__(self):
        owner_name = self.owner.full_name if self.owner_id else 'Unknown'
        return f'{self.plate_number} ({owner_name})'

    def save(self, *args, **kwargs):
        if self.driver_id and not self.owner_id:
            self.owner = self.driver.user
        super().save(*args, **kwargs)
