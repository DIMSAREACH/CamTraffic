from django.conf import settings
from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class NotificationTemplate(TimeStampedModel, ActiveModel):
    class Channel(models.TextChoices):
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        IN_APP = 'in_app', 'In-App'

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    subject_en = models.CharField(max_length=200)
    subject_km = models.CharField(max_length=200, blank=True)
    body_en = models.TextField()
    body_km = models.TextField(blank=True)

    class Meta:
        db_table = 'notifications_template'
        ordering = ['code']

    def __str__(self) -> str:
        return self.name


class Notification(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.title} → {self.user}'
