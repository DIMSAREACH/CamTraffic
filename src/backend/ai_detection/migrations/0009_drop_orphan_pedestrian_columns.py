from django.db import migrations


class Migration(migrations.Migration):
    """Drop orphan pedestrian columns left by a removed local migration."""

    dependencies = [
        ('ai_detection', '0008_uuid_schema_alignment'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE ai_detection_logs
                  DROP COLUMN IF EXISTS detected_pedestrians,
                  DROP COLUMN IF EXISTS pedestrian_count;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
