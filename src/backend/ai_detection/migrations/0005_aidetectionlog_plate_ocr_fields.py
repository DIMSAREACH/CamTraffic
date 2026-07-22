from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_detection', '0004_aidetectionlog_detected_vehicles_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='aidetectionlog',
            name='detected_plate',
            field=models.CharField(blank=True, db_index=True, max_length=30),
        ),
        migrations.AddField(
            model_name='aidetectionlog',
            name='plate_confidence',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='aidetectionlog',
            name='plate_type',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='aidetectionlog',
            name='plate_ocr_details',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='aidetectionlog',
            name='matched_vehicle_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
