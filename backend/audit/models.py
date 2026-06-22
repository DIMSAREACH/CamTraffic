from django.conf import settings
from django.db import models

from core.models import UUIDPrimaryKeyModel


class AuditLog(UUIDPrimaryKeyModel):
    """Immutable audit trail — PRD table `audit_logs`."""

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    old_value = models.JSONField(default=dict, blank=True)
    new_value = models.JSONField(default=dict, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp'], name='idx_audit_user_ts'),
            models.Index(fields=['resource', 'resource_id'], name='idx_audit_resource'),
            models.Index(fields=['action', '-timestamp'], name='idx_audit_action_ts'),
        ]

    def __str__(self):
        return f'{self.action} {self.resource}:{self.resource_id} @ {self.timestamp:%Y-%m-%d %H:%M}'
