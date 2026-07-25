from django.urls import path

from .views import (
    DetectSignView,
    DetectVideoView,
    DetectionLogDetailView,
    DetectionLogExportView,
    DetectionLogListView,
    DetectionLogReviewView,
    DetectionPageStatsView,
    KhmerTTSView,
    ProcessFrameView,
    WarmupModelsView,
)
from .ocr_training_views import (
    OcrTrainingBaselineView,
    OcrTrainingEdgeCasesView,
    OcrTrainingPrereqView,
    OcrTrainingStatusView,
)
from .metrics_views import PublishedModelMetricsView
from .video_live_views import (
    LiveFrameView,
    LiveRecordStartView,
    LiveRecordStopView,
    LiveSnapshotView,
    LiveStartView,
    LiveStatusView,
    LiveStopView,
    VideoResultView,
    VideoReviewView,
    VideoStreamEventsView,
    VideoUploadStreamView,
)

urlpatterns = [
    path('detect/', DetectSignView.as_view(), name='ai-detect'),
    path('detect-video/', DetectVideoView.as_view(), name='ai-detect-video'),
    path('process-frame/', ProcessFrameView.as_view(), name='ai-process-frame'),
    # Frontend webcam snapshot endpoint (posts multipart image or camera_id)
    path('capture-webcam/', ProcessFrameView.as_view(), name='ai-capture-webcam'),
    path('warmup/', WarmupModelsView.as_view(), name='ai-warmup'),
    path('tts/', KhmerTTSView.as_view(), name='ai-tts'),
    path('logs/', DetectionLogListView.as_view(), name='ai-logs'),
    path('logs/export/', DetectionLogExportView.as_view(), name='ai-logs-export'),
    path('logs/<uuid:pk>/', DetectionLogDetailView.as_view(), name='ai-log-detail'),
    path('logs/<uuid:pk>/review/', DetectionLogReviewView.as_view(), name='ai-log-review'),
    path('stats/', DetectionPageStatsView.as_view(), name='ai-page-stats'),
    path('model-metrics/', PublishedModelMetricsView.as_view(), name='ai-model-metrics'),
    path('ocr-training/', OcrTrainingStatusView.as_view(), name='ai-ocr-training-status'),
    path('ocr-training/prereq/', OcrTrainingPrereqView.as_view(), name='ai-ocr-training-prereq'),
    path('ocr-training/baseline/', OcrTrainingBaselineView.as_view(), name='ai-ocr-training-baseline'),
    path('ocr-training/edge-cases/', OcrTrainingEdgeCasesView.as_view(), name='ai-ocr-training-edge'),
    # Realtime Upload Video + Live Camera (thesis production module)
    path('video/upload/', VideoUploadStreamView.as_view(), name='ai-video-upload-stream'),
    path('video/<uuid:pk>/stream/', VideoStreamEventsView.as_view(), name='ai-video-stream-events'),
    path('video/<uuid:pk>/review/', VideoReviewView.as_view(), name='ai-video-review'),
    path('video/result/<uuid:pk>/', VideoResultView.as_view(), name='ai-video-result'),
    path('live/start/', LiveStartView.as_view(), name='ai-live-start'),
    path('live/stop/', LiveStopView.as_view(), name='ai-live-stop'),
    path('live/status/', LiveStatusView.as_view(), name='ai-live-status'),
    path('live/frame/', LiveFrameView.as_view(), name='ai-live-frame'),
    path('live/snapshot/', LiveSnapshotView.as_view(), name='ai-live-snapshot'),
    path('live/record/start/', LiveRecordStartView.as_view(), name='ai-live-record-start'),
    path('live/record/stop/', LiveRecordStopView.as_view(), name='ai-live-record-stop'),
]
