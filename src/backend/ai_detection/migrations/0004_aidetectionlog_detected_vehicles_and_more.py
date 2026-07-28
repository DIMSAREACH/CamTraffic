from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_detection', '0003_aidetectionlog_model_version_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='aidetectionlog',
            name='detected_vehicles',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='aidetectionlog',
            name='vehicle_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
