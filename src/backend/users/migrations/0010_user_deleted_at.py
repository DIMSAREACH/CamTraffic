# Generated manually for soft-delete support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_phase4_officers_stations'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='deleted_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['deleted_at'], name='idx_user_deleted_at'),
        ),
    ]
