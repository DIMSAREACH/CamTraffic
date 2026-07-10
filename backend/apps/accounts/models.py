from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Administrator'
        ADMIN = 'admin', 'Administrator'
        OFFICER = 'officer', 'Traffic Officer'
        DRIVER = 'driver', 'Driver'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DRIVER,
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)

    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-date_joined']

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    @property
    def full_name(self) -> str:
        return self.get_full_name()
