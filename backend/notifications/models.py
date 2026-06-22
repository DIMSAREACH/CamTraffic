from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel


class Notification(UUIDPrimaryKeyModel):
    """In-app notification — PRD table `notifications`."""

    TYPE_CHOICES = [
        ('fine', 'Fine'),
        ('violation', 'Violation'),
        ('detection', 'Detection'),
        ('alert', 'Alert'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_object_id = models.CharField(max_length=100, blank=True)
    related_object_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at'], name='idx_notif_user_read_created'),
            models.Index(fields=['type', '-created_at'], name='idx_notif_type_created'),
        ]

    def __str__(self):
        return self.title
