"""Notification models - In-app, Push, SMS"""
from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel


class Notification(TimeStampedUUIDModel):
    """In-app notification — PRD table `notifications`."""

    TYPE_CHOICES = [
        ('fine', 'Fine Issued'),
        ('violation', 'Violation Detected'),
        ('detection', 'AI Detection'),
        ('appeal', 'Appeal Update'),
        ('payment', 'Payment Confirmation'),
        ('system', 'System Message'),
        ('alert', 'Alert'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Optional links
    link_url = models.CharField(max_length=500, blank=True)
    fine_id = models.UUIDField(null=True, blank=True)
    violation_id = models.UUIDField(null=True, blank=True)
    appeal_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_notif_user_created'),
            models.Index(fields=['user', 'is_read'], name='idx_notif_user_read'),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.title}'


class PushDevice(TimeStampedUUIDModel):
    """User's registered push notification devices"""
    
    PLATFORM_CHOICES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web Browser'),
        ('desktop', 'Desktop App'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_devices',
    )
    
    # Device info
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    device_name = models.CharField(max_length=255, blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    
    # FCM token (for mobile apps)
    fcm_token = models.TextField(blank=True, db_index=True)
    
    # Web Push subscription (for browsers)
    web_push_endpoint = models.TextField(blank=True, db_index=True)
    web_push_p256dh = models.TextField(blank=True)
    web_push_auth = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'push_devices'
        ordering = ['-last_used_at']
        indexes = [
            models.Index(fields=['user', 'is_active'], name='idx_push_user_active'),
            models.Index(fields=['fcm_token'], name='idx_push_fcm_token'),
            models.Index(fields=['web_push_endpoint'], name='idx_push_web_endpoint'),
        ]
    
    def __str__(self):
        return f'{self.user.email} - {self.platform} - {self.device_name}'


class SMSLog(TimeStampedUUIDModel):
    """SMS delivery log for audit trail"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('undelivered', 'Undelivered'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sms_logs',
    )
    phone_number = models.CharField(max_length=20)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, default='system')
    
    # Twilio/SMS gateway info
    provider = models.CharField(max_length=50, default='twilio')
    provider_message_sid = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    # Cost tracking (optional)
    cost = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sms_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_sms_user_created'),
            models.Index(fields=['status'], name='idx_sms_status'),
            models.Index(fields=['provider_message_sid'], name='idx_sms_provider_sid'),
        ]
    
    def __str__(self):
        return f'{self.phone_number} - {self.status}'
