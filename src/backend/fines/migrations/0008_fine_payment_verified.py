# Generated manually for payment settlement audit fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fines', '0007_installments'),
    ]

    operations = [
        migrations.AddField(
            model_name='fine',
            name='payment_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='fine',
            name='payment_verified_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='fines_payment_verified',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
