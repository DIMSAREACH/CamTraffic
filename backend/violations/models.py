from django.db import models

from infrastructure.models import Camera, Road
from users.models import Driver, Officer
from vehicles.models import Vehicle


class ViolationRule(models.Model):
    """Maps a detected sign + observed driver action to a violation type."""

    sign_class_key = models.CharField(max_length=80, db_index=True)
    prohibited_action = models.CharField(max_length=50)
    violation_type = models.CharField(max_length=50, db_index=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    default_fine_amount = models.DecimalField(max_digits=10, decimal_places=2, default=25)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'violation_rules'
        ordering = ['sign_class_key', 'prohibited_action']
        constraints = [
            models.UniqueConstraint(
                fields=['sign_class_key', 'prohibited_action'],
                name='uniq_violation_rule_sign_action',
            ),
        ]

    def __str__(self):
        return f'{self.violation_type} ({self.sign_class_key} + {self.prohibited_action})'


class TrafficViolation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
    ]

    VIOLATION_TYPE_CHOICES = [
        ('ILLEGAL_LEFT_TURN', 'Illegal Left Turn'),
        ('ILLEGAL_RIGHT_TURN', 'Illegal Right Turn'),
        ('ILLEGAL_U_TURN', 'Illegal U-Turn'),
        ('NO_PARKING', 'No Parking'),
        ('NO_STOPPING', 'No Stopping'),
        ('ROAD_CLOSED', 'Road Closed Violation'),
        ('WEIGHT_LIMIT_VIOLATION', 'Weight Limit Violation'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name='violations')
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations',
    )
    officer = models.ForeignKey(
        Officer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations_recorded',
    )
    camera = models.ForeignKey(
        Camera,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations',
    )
    road = models.ForeignKey(
        Road,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations',
    )
    ai_detection_log = models.ForeignKey(
        'ai_detection.AIDetectionLog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations',
    )
    violation_type = models.CharField(max_length=50, choices=VIOLATION_TYPE_CHOICES, blank=True, db_index=True)
    observed_action = models.CharField(max_length=50, blank=True)
    detected_sign_code = models.CharField(max_length=30, blank=True)
    detected_class_key = models.CharField(max_length=80, blank=True)
    violation_date = models.DateTimeField()
    location = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    evidence_image = models.ImageField(upload_to='violations/evidence/', blank=True, null=True)
    vehicle_evidence_image = models.ImageField(upload_to='violations/evidence/vehicles/', blank=True, null=True)
    plate_evidence_image = models.ImageField(upload_to='violations/evidence/plates/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'traffic_violations'
        ordering = ['-violation_date']
        indexes = [
            models.Index(fields=['status', 'violation_date'], name='idx_violation_status_date'),
            models.Index(fields=['camera', 'violation_date'], name='idx_violation_camera_date'),
            models.Index(fields=['violation_type', 'violation_date'], name='idx_violation_type_date'),
        ]

    def __str__(self):
        label = self.violation_type or 'Violation'
        return f'{label} #{self.id} ({self.status})'
