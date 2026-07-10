from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drivers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='driver',
            name='notify_appeals',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='driver',
            name='notify_email',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='driver',
            name='notify_fines',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='driver',
            name='notify_violations',
            field=models.BooleanField(default=True),
        ),
    ]
