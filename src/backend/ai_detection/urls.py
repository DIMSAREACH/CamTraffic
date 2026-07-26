from django.urls import path

from .views import (
    AIModelsCatalogView,
    DetectSignView,
    DetectVideoView,
    DetectionLogDetailView,
    DetectionLogExportView,
    DetectionLogListView,
    DetectionLogReviewView,
    DetectionPageStatsView,
    DetectionWebcamView,
    DetectionReadyView,
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

urlpatterns = [
    # Health check (no auth required)
    path('ready/', DetectionReadyView.as_view(), name='ai-ready'),
    # Legacy / operational routes
    path('detect/', DetectSignView.as_view(), name='ai-detect'),
    path('detect-video/', DetectVideoView.as_view(), name='ai-detect-video'),
    path('process-frame/', ProcessFrameView.as_view(), name='ai-process-frame'),
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
    # Master Build Prompt aliases (exact PRD surface under /api/ai/)
    path('image/', DetectSignView.as_view(), name='ai-image'),
    path('video/', DetectVideoView.as_view(), name='ai-video'),
    path('webcam/', DetectionWebcamView.as_view(), name='ai-webcam'),
    path('live-camera/', ProcessFrameView.as_view(), name='ai-live-camera'),
    path('history/', DetectionLogListView.as_view(), name='ai-history'),
    path('history/<uuid:pk>/', DetectionLogDetailView.as_view(), name='ai-history-detail'),
    path('statistics/', DetectionPageStatsView.as_view(), name='ai-statistics'),
    path('models/', AIModelsCatalogView.as_view(), name='ai-models-catalog'),
]
