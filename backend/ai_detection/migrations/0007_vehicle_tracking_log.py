from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ai_detection', '0006_evidence_snapshots'),
    ]

    operations = [
        migrations.CreateModel(
            name='VehicleTrackingLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('track_session_id', models.CharField(db_index=True, max_length=64)),
                ('track_id', models.PositiveIntegerField()),
                ('vehicle_type', models.CharField(max_length=20)),
                ('confidence', models.FloatField(default=0.0)),
                ('bbox', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'detection_log',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='tracking_logs',
                        to='ai_detection.aidetectionlog',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='vehicle_tracking_logs',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'vehicle_tracking_logs',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['track_session_id', 'track_id'], name='idx_track_session_id'),
                ],
            },
        ),
    ]
