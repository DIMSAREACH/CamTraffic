"""Video / live streaming detection models (thesis realtime module)."""
from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel, UUIDPrimaryKeyModel


class VideoDetection(TimeStampedUUIDModel):
    """One uploaded video or live session detection job."""

    SOURCE_CHOICES = [
        ('upload', 'Upload Video'),
        ('live', 'Live Camera'),
        ('webcam', 'Browser Webcam'),
        ('simulation', 'Local Simulation'),
    ]
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('streaming', 'Streaming'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    REVIEW_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_detections',
    )
    camera = models.ForeignKey(
        'infrastructure.Camera',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='video_detections',
    )
    ai_detection_log = models.ForeignKey(
        'ai_detection.AIDetectionLog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='video_detections',
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='upload')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued', db_index=True)
    review_status = models.CharField(max_length=20, choices=REVIEW_CHOICES, default='pending')
    original_video = models.FileField(upload_to='ai/video/original/', blank=True, null=True)
    annotated_video = models.FileField(upload_to='ai/video/annotated/', blank=True, null=True)
    title = models.CharField(max_length=200, blank=True)
    model_name = models.CharField(max_length=80, blank=True, default='YOLOv8')
    model_version = models.CharField(max_length=80, blank=True)
    fps_original = models.FloatField(default=0.0)
    fps_process = models.FloatField(default=0.0)
    total_frames = models.PositiveIntegerField(default=0)
    processed_frames = models.PositiveIntegerField(default=0)
    current_frame = models.PositiveIntegerField(default=0)
    detection_count = models.PositiveIntegerField(default=0)
    vehicle_count = models.PositiveIntegerField(default=0)
    sign_count = models.PositiveIntegerField(default=0)
    plate_count = models.PositiveIntegerField(default=0)
    plate_text = models.CharField(max_length=40, blank=True)
    plate_confidence = models.FloatField(default=0.0)
    avg_confidence = models.FloatField(default=0.0)
    processing_time_sec = models.FloatField(default=0.0)
    detection_json = models.JSONField(default=dict, blank=True)
    violation_suggestion = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    observed_action = models.CharField(max_length=50, blank=True)
    is_recording = models.BooleanField(default=False)

    class Meta:
        db_table = 'video_detections'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_videodet_user_created'),
            models.Index(fields=['status'], name='idx_videodet_status'),
        ]

    def __str__(self):
        return f'VideoDetection {self.id} ({self.source_type}/{self.status})'

    @property
    def progress_pct(self) -> float:
        if self.total_frames <= 0:
            return 0.0
        return min(100.0, round(100.0 * self.processed_frames / self.total_frames, 1))


class VideoFrame(UUIDPrimaryKeyModel):
    """Per-frame detection snapshot for streaming playback."""

    video_detection = models.ForeignKey(
        VideoDetection,
        on_delete=models.CASCADE,
        related_name='frames',
    )
    frame_index = models.PositiveIntegerField()
    timestamp_sec = models.FloatField(default=0.0)
    annotated_image = models.ImageField(upload_to='ai/video/frames/', blank=True, null=True)
    detections_json = models.JSONField(default=dict, blank=True)
    sign_count = models.PositiveIntegerField(default=0)
    vehicle_count = models.PositiveIntegerField(default=0)
    plate_text = models.CharField(max_length=40, blank=True)
    plate_confidence = models.FloatField(default=0.0)
    confidence = models.FloatField(default=0.0)
    processing_ms = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'video_frames'
        ordering = ['frame_index']
        constraints = [
            models.UniqueConstraint(
                fields=['video_detection', 'frame_index'],
                name='uniq_video_frame_index',
            ),
        ]

    def __str__(self):
        return f'Frame {self.frame_index} of {self.video_detection_id}'


class VideoEvidence(UUIDPrimaryKeyModel):
    """Saved evidence artifacts for a video/live detection job."""

    EVIDENCE_TYPES = [
        ('original_video', 'Original Video'),
        ('annotated_video', 'Annotated Video'),
        ('frame', 'Frame Image'),
        ('plate_crop', 'Plate Crop'),
        ('json', 'Detection JSON'),
        ('csv', 'CSV Report'),
        ('pdf', 'PDF Report'),
        ('recording', 'Live Recording'),
    ]

    video_detection = models.ForeignKey(
        VideoDetection,
        on_delete=models.CASCADE,
        related_name='evidence_items',
    )
    evidence_type = models.CharField(max_length=30, choices=EVIDENCE_TYPES)
    file = models.FileField(upload_to='ai/video/evidence/', blank=True, null=True)
    label = models.CharField(max_length=200, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'video_evidence'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.evidence_type} for {self.video_detection_id}'
