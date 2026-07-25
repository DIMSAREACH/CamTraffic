# Road missing fields migration — safe for fresh DBs and already-migrated production Postgres.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0007_camera_production_cctv_fields"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="road",
                    name="commune",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AddField(
                    model_name="road",
                    name="country",
                    field=models.CharField(blank=True, default="Cambodia", max_length=100),
                ),
                migrations.AddField(
                    model_name="road",
                    name="deleted_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="road",
                    name="description",
                    field=models.TextField(blank=True, default=""),
                ),
                migrations.AddField(
                    model_name="road",
                    name="direction",
                    field=models.CharField(blank=True, default="", max_length=50),
                ),
                migrations.AddField(
                    model_name="road",
                    name="district",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AddField(
                    model_name="road",
                    name="end_latitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=7, max_digits=10, null=True
                    ),
                ),
                migrations.AddField(
                    model_name="road",
                    name="end_longitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=7, max_digits=10, null=True
                    ),
                ),
                migrations.AddField(
                    model_name="road",
                    name="is_deleted",
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name="road",
                    name="lanes",
                    field=models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="road",
                    name="province",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AddField(
                    model_name="road",
                    name="road_code",
                    field=models.CharField(blank=True, default="", max_length=50),
                ),
                migrations.AddField(
                    model_name="road",
                    name="start_latitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=7, max_digits=10, null=True
                    ),
                ),
                migrations.AddField(
                    model_name="road",
                    name="start_longitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=7, max_digits=10, null=True
                    ),
                ),
                migrations.AddField(
                    model_name="road",
                    name="village",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AlterField(
                    model_name="camera",
                    name="frame_source_url",
                    field=models.CharField(
                        blank=True,
                        default="",
                        help_text="Preferred snapshot/stream URL (HTTP JPEG, RTSP, or /media/cctv/…)",
                        max_length=500,
                    ),
                ),
                migrations.AlterField(
                    model_name="road",
                    name="city",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AlterField(
                    model_name="road",
                    name="region",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS road_code varchar(50) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS lanes smallint NULL;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS direction varchar(50) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS description text DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS district varchar(100) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS commune varchar(100) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS village varchar(100) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS country varchar(100) DEFAULT 'Cambodia';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS province varchar(100) DEFAULT '';
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS start_latitude numeric(10,7) NULL;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS start_longitude numeric(10,7) NULL;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS end_latitude numeric(10,7) NULL;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS end_longitude numeric(10,7) NULL;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT FALSE;
                    ALTER TABLE roads ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
                    
                    -- Ensure defaults are set
                    ALTER TABLE roads ALTER COLUMN road_code SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN direction SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN description SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN district SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN commune SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN village SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN country SET DEFAULT 'Cambodia';
                    ALTER TABLE roads ALTER COLUMN province SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN is_deleted SET DEFAULT FALSE;
                    ALTER TABLE roads ALTER COLUMN city SET DEFAULT '';
                    ALTER TABLE roads ALTER COLUMN region SET DEFAULT '';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
        ),
    ]
