from django.db import models


class Road(models.Model):
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
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roads'
        ordering = ['name']

    def __str__(self):
        return self.name


class Camera(models.Model):
    CAMERA_TYPES = [
        ('fixed', 'Fixed'),
        ('ptz', 'PTZ'),
        ('speed', 'Speed'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
    ]

    road = models.ForeignKey(Road, on_delete=models.PROTECT, related_name='cameras')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, blank=True)
    model = models.CharField(max_length=100, blank=True)
    camera_type = models.CharField(max_length=30, choices=CAMERA_TYPES, default='fixed')
    installed_date = models.DateField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    frame_source_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='Optional HTTP URL for live/snapshot frame preview (FE-08)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cameras'
        ordering = ['road', 'name']

    def __str__(self):
        return f'{self.name} ({self.road.name})'


class TrafficSignal(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
    ]

    road = models.ForeignKey(Road, on_delete=models.PROTECT, related_name='traffic_signals')
    signal_code = models.CharField(max_length=50)
    cycle_duration = models.PositiveIntegerField(default=120, help_text='Seconds')
    timing_sequence = models.JSONField(default=dict, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
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
