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
        indexes = [
            models.Index(fields=['role', 'is_active'], name='idx_user_role_active'),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.role})'

    @property
    def display_name(self):
        return self.full_name or self.email


class Officer(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='officer_profile')
    badge_no = models.CharField(max_length=50, unique=True)
    rank = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'officers'
        ordering = ['badge_no']

    def __str__(self):
        return f'{self.badge_no} ({self.user.full_name})'


class Driver(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    license_no = models.CharField(max_length=50, unique=True, db_index=True)
    license_expiry = models.DateField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'drivers'
        ordering = ['license_no']

    def __str__(self):
        return f'{self.license_no} ({self.user.full_name})'


class UserPreference(models.Model):
    """Per-user notification and security preferences."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    notify_fines = models.BooleanField(default=True)
    notify_detections = models.BooleanField(default=True)
    notify_alerts = models.BooleanField(default=True)
    notify_system = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    login_notifications = models.BooleanField(default=True)
    suspicious_alerts = models.BooleanField(default=True)
    muted_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'

    def __str__(self):
        return f'Preferences for {self.user.email}'


class LoginEvent(models.Model):
    """Audit trail for sign-in attempts."""

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_events')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_label = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_login_user_created'),
        ]

    def __str__(self):
        return f'{self.user.email} · {self.status} · {self.created_at:%Y-%m-%d %H:%M}'
