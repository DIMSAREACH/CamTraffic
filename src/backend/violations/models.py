from django.db import models

from core.models import TimeStampedUUIDModel, UUIDPrimaryKeyModel
from infrastructure.models import Camera, Road
from users.models import Driver, Officer
from vehicles.models import Vehicle


class ViolationRule(UUIDPrimaryKeyModel):
    """Expert-system rule — maps detection conditions to violation type + penalty."""

    CATEGORY_CHOICES = [
        ('traffic_sign', 'Traffic Sign'),
        ('vehicle_behavior', 'Vehicle Behavior'),
        ('speed', 'Speed Violation'),
        ('traffic_light', 'Traffic Light'),
        ('parking', 'Parking'),
        ('lane_violation', 'Lane Violation'),
        ('vehicle_equipment', 'Vehicle Equipment'),
        ('other', 'Other'),
    ]

    rule_code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        default='',
        db_index=True,
        help_text='Human-readable code e.g. VR001',
    )
    category = models.CharField(
        max_length=40,
        choices=CATEGORY_CHOICES,
        default='traffic_sign',
        db_index=True,
    )
    detection_type = models.CharField(
        max_length=40,
        blank=True,
        default='yolo',
        help_text='yolo | ocr | fusion | manual',
    )
    priority = models.PositiveSmallIntegerField(
        default=3,
        help_text='1 = highest priority, 5 = lowest',
    )
    sign_class_key = models.CharField(max_length=80, db_index=True)
    prohibited_action = models.CharField(max_length=50)
    violation_type = models.CharField(max_length=50, db_index=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    default_fine_amount = models.DecimalField(max_digits=10, decimal_places=2, default=25)
    demerit_points = models.PositiveSmallIntegerField(
        default=0,
        help_text='Demerit points applied to the driver license when the violation is confirmed.',
    )
    legal_reference = models.CharField(
        max_length=200,
        blank=True,
        help_text='Cambodia Land Traffic Law article / schedule reference (illustrative for thesis).',
    )
    warning_only = models.BooleanField(default=False)
    auto_generate_fine = models.BooleanField(default=True)
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Category-specific conditions + AI settings (confidence, OCR, review, evidence).',
    )
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
        code = self.rule_code or '—'
        return f'{code} {self.violation_type} ({self.sign_class_key} + {self.prohibited_action})'

    def save(self, *args, **kwargs):
        if not (self.rule_code or '').strip():
            self.rule_code = ViolationRule._next_rule_code()
        super().save(*args, **kwargs)

    @staticmethod
    def _next_rule_code() -> str:
        last = (
            ViolationRule.objects.exclude(rule_code='')
            .order_by('-created_at')
            .values_list('rule_code', flat=True)
            .first()
        )
        n = 1
        if last:
            digits = ''.join(ch for ch in str(last) if ch.isdigit())
            if digits:
                n = int(digits) + 1
        return f'VR{n:03d}'


class TrafficViolation(TimeStampedUUIDModel):
    """AI-captured or manually flagged violation — PRD table `traffic_violations`."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
        ('closed', 'Closed'),
    ]

    VIOLATION_TYPE_CHOICES = [
        ('NO_ENTRY', 'No Entry'),
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
    officer_note = models.TextField(blank=True)
    dismissal_reason = models.CharField(max_length=200, blank=True)
    evidence_image = models.ImageField(upload_to='violations/evidence/', blank=True, null=True)
    vehicle_evidence_image = models.ImageField(upload_to='violations/evidence/vehicles/', blank=True, null=True)
    plate_evidence_image = models.ImageField(upload_to='violations/evidence/plates/', blank=True, null=True)
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    plate_detected = models.CharField(max_length=20, blank=True, db_index=True)
    speed_detected = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    road_speed_limit = models.PositiveIntegerField(null=True, blank=True)
    bbox_coords = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    class Meta:
        db_table = 'traffic_violations'
        ordering = ['-violation_date']
        indexes = [
            models.Index(fields=['status', 'violation_date'], name='idx_violation_status_date'),
            models.Index(fields=['camera', 'violation_date'], name='idx_violation_camera_date'),
            models.Index(fields=['violation_type', 'violation_date'], name='idx_violation_type_date'),
            models.Index(fields=['driver', 'status'], name='idx_violation_driver_status'),
            models.Index(fields=['plate_detected'], name='idx_violation_plate'),
        ]

    def __str__(self):
        label = self.violation_type or 'Violation'
        return f'{label} #{self.id} ({self.status})'
