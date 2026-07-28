from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='auth_provider',
            field=models.CharField(
                choices=[('email', 'Email & password'), ('google', 'Google'), ('github', 'GitHub')],
                default='email',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='social_uid',
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                condition=models.Q(('social_uid__isnull', False)),
                fields=('auth_provider', 'social_uid'),
                name='unique_social_provider_uid',
            ),
        ),
    ]
