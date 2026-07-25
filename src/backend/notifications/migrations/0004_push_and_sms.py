# Generated migration for PushDevice and SMSLog models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notifications', '0003_uuid_schema_alignment'),
    ]

    operations = [
        migrations.CreateModel(
            name='PushDevice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('platform', models.CharField(choices=[('android', 'Android'), ('ios', 'iOS'), ('web', 'Web Browser'), ('desktop', 'Desktop App')], max_length=20)),
                ('device_name', models.CharField(blank=True, max_length=255)),
                ('device_id', models.CharField(blank=True, max_length=255)),
                ('fcm_token', models.TextField(blank=True, db_index=True)),
                ('web_push_endpoint', models.TextField(blank=True, db_index=True)),
                ('web_push_p256dh', models.TextField(blank=True)),
                ('web_push_auth', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('last_used_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_devices', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'push_devices',
                'ordering': ['-last_used_at'],
            },
        ),
        migrations.CreateModel(
            name='SMSLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('phone_number', models.CharField(max_length=20)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(default='system', max_length=20)),
                ('provider', models.CharField(default='twilio', max_length=50)),
                ('provider_message_sid', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('failed', 'Failed'), ('undelivered', 'Undelivered')], default='pending', max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('cost', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sms_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'sms_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='pushdevice',
            index=models.Index(fields=['user', 'is_active'], name='idx_push_user_active'),
        ),
        migrations.AddIndex(
            model_name='pushdevice',
            index=models.Index(fields=['fcm_token'], name='idx_push_fcm_token'),
        ),
        migrations.AddIndex(
            model_name='pushdevice',
            index=models.Index(fields=['web_push_endpoint'], name='idx_push_web_endpoint'),
        ),
        migrations.AddIndex(
            model_name='smslog',
            index=models.Index(fields=['user', '-created_at'], name='idx_sms_user_created'),
        ),
        migrations.AddIndex(
            model_name='smslog',
            index=models.Index(fields=['status'], name='idx_sms_status'),
        ),
        migrations.AddIndex(
            model_name='smslog',
            index=models.Index(fields=['provider_message_sid'], name='idx_sms_provider_sid'),
        ),
    ]
