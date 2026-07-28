from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('violations', '0007_rule_create_page_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='trafficviolation',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending_review', 'Pending Review'),
                    ('confirmed', 'Confirmed'),
                    ('rejected', 'Rejected'),
                    ('closed', 'Closed'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
    ]
