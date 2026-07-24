# Camera production CCTV fields — safe for fresh DBs and already-migrated Postgres.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('infrastructure', '0006_camera_stream_url_charfield'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='camera',
                    name='ai_enabled',
                    field=models.BooleanField(default=True),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='bitrate',
                    field=models.CharField(blank=True, default='', max_length=50),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='brand',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='codec',
                    field=models.CharField(blank=True, default='', max_length=50),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='confidence_threshold',
                    field=models.DecimalField(decimal_places=2, default=0.35, max_digits=5),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='description',
                    field=models.TextField(blank=True, default=''),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='detection_type',
                    field=models.CharField(blank=True, default='street', max_length=50),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='district',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='fps',
                    field=models.IntegerField(default=25),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='ip_address',
                    field=models.GenericIPAddressField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='is_disabled',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='last_sync_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='onvif_enabled',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='password_encrypted',
                    field=models.TextField(blank=True, default=''),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='port',
                    field=models.IntegerField(default=554),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='province',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='recording_enabled',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='rtsp_url',
                    field=models.CharField(blank=True, default='', max_length=500),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='serial_number',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='street',
                    field=models.CharField(blank=True, default='', max_length=200),
                ),
                migrations.AddField(
                    model_name='camera',
                    name='username',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AlterField(
                    model_name='camera',
                    name='frame_source_url',
                    field=models.CharField(
                        blank=True,
                        default='',
                        help_text='Preferred snapshot/stream URL (HTTP JPEG, RTSP, or /demo-cameras/…)',
                        max_length=500,
                    ),
                ),
                migrations.AlterField(
                    model_name='camera',
                    name='resolution',
                    field=models.CharField(blank=True, default='', help_text='e.g. 1080p', max_length=32),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT TRUE;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS bitrate varchar(50) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS brand varchar(100) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS codec varchar(50) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS confidence_threshold numeric(5,2) DEFAULT 0.35;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS description text DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS detection_type varchar(50) DEFAULT 'street';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS district varchar(100) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS fps integer DEFAULT 25;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS ip_address inet NULL;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT FALSE;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_sync_at timestamptz NULL;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS onvif_enabled boolean DEFAULT FALSE;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS password_encrypted text DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS port integer DEFAULT 554;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS province varchar(100) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS recording_enabled boolean DEFAULT FALSE;
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS rtsp_url varchar(500) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS serial_number varchar(100) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS street varchar(200) DEFAULT '';
                    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS username varchar(100) DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN frame_source_url SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN resolution SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN ai_enabled SET DEFAULT TRUE;
                    ALTER TABLE cameras ALTER COLUMN bitrate SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN brand SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN codec SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN confidence_threshold SET DEFAULT 0.35;
                    ALTER TABLE cameras ALTER COLUMN description SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN detection_type SET DEFAULT 'street';
                    ALTER TABLE cameras ALTER COLUMN district SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN fps SET DEFAULT 25;
                    ALTER TABLE cameras ALTER COLUMN is_disabled SET DEFAULT FALSE;
                    ALTER TABLE cameras ALTER COLUMN onvif_enabled SET DEFAULT FALSE;
                    ALTER TABLE cameras ALTER COLUMN password_encrypted SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN port SET DEFAULT 554;
                    ALTER TABLE cameras ALTER COLUMN province SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN recording_enabled SET DEFAULT FALSE;
                    ALTER TABLE cameras ALTER COLUMN rtsp_url SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN serial_number SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN street SET DEFAULT '';
                    ALTER TABLE cameras ALTER COLUMN username SET DEFAULT '';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
        ),
    ]
