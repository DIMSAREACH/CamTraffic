from django.db import models

from core.models import TimeStampedUUIDModel, UUIDPrimaryKeyModel


class Road(TimeStampedUUIDModel):
    """Road segment — PRD table `roads`."""

    ROAD_TYPES = [
        ('highway', 'Highway'),
        ('urban', 'Urban'),
        ('rural', 'Rural'),
        ('intersection', 'Intersection'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
    ]

    name = models.CharField(max_length=200)
    road_type = models.CharField(max_length=30, choices=ROAD_TYPES, default='urban')
    length_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    speed_limit = models.PositiveIntegerField(default=60)
    city = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'roads'
        ordering = ['name']
        indexes = [
            models.Index(fields=['status', 'city'], name='idx_road_status_city'),
        ]

    def __str__(self):
        return self.name


class Camera(TimeStampedUUIDModel):
    """Physical camera unit — PRD table `cameras`."""

    CAMERA_TYPES = [
        ('fixed', 'Fixed'),
        ('ptz', 'PTZ'),
        ('mobile', 'Mobile'),
        ('speed', 'Speed'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('offline', 'Offline'),
        ('maintenance', 'Maintenance'),
    ]

    road = models.ForeignKey(Road, on_delete=models.PROTECT, related_name='cameras')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, blank=True)
    model = models.CharField(max_length=100, blank=True)
    camera_type = models.CharField(max_length=20, choices=CAMERA_TYPES, default='fixed')
    installed_date = models.DateField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    frame_source_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='RTSP or HTTPS stream/snapshot URL (PRD: stream_url)',
    )
    resolution = models.CharField(max_length=10, blank=True, help_text='e.g. 1080p')
    last_ping = models.DateTimeField(null=True, blank=True)
    detection_count_today = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'cameras'
        ordering = ['road', 'name']
        indexes = [
            models.Index(fields=['road', 'status'], name='idx_camera_road_status'),
            models.Index(fields=['status', '-last_ping'], name='idx_camera_status_ping'),
        ]

    def __str__(self):
        return f'{self.name} ({self.road.name})'


class TrafficSignal(UUIDPrimaryKeyModel):
    """Signal timing at intersections (implementation extension)."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
    ]

    road = models.ForeignKey(Road, on_delete=models.PROTECT, related_name='traffic_signals')
    signal_code = models.CharField(max_length=50)
    cycle_duration = models.PositiveIntegerField(default=120, help_text='Seconds')
    timing_sequence = models.JSONField(default=dict, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'traffic_signals'
        ordering = ['road', 'signal_code']
        constraints = [
            models.UniqueConstraint(fields=['road', 'signal_code'], name='uniq_road_signal_code'),
        ]

    def __str__(self):
        return f'{self.signal_code} @ {self.road.name}'
