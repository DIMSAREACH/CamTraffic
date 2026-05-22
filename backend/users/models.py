from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Custom user model for CamTraffic system."""

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('police', 'Traffic Police'),
        ('driver', 'Driver'),
    ]

    AUTH_PROVIDER_CHOICES = [
        ('email', 'Email & password'),
        ('google', 'Google'),
        ('github', 'GitHub'),
    ]

    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='driver')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    license_no = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default='email')
    social_uid = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.role})'

    @property
    def display_name(self):
        return self.full_name or self.email
