from django.conf import settings
from django.db import models


class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('motorcycle', 'Motorcycle'),
        ('truck', 'Truck'),
        ('bus', 'Bus'),
        ('tuk-tuk', 'Tuk-Tuk'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('expired', 'Expired'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
    )
    driver = models.ForeignKey(
        'users.Driver',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles',
    )
    plate_number = models.CharField(max_length=20, unique=True, db_index=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES, default='car')
    model = models.CharField(max_length=100)
    color = models.CharField(max_length=50)
    year = models.PositiveIntegerField(default=2020)
    engine_no = models.CharField(max_length=80, blank=True, null=True, db_index=True)
    chassis_no = models.CharField(max_length=80, blank=True, null=True, db_index=True)
    registration_expiry = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner'], name='idx_vehicle_owner'),
        ]

    def __str__(self):
        return f'{self.plate_number} ({self.owner.full_name})'
