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
)
from .ocr_training_views import (
    OcrTrainingBaselineView,
    OcrTrainingEdgeCasesView,
    OcrTrainingPrereqView,
    OcrTrainingStatusView,
)

urlpatterns = [
    path('detect/', DetectSignView.as_view(), name='ai-detect'),
    path('detect-video/', DetectVideoView.as_view(), name='ai-detect-video'),
    path('process-frame/', ProcessFrameView.as_view(), name='ai-process-frame'),
    # Frontend webcam snapshot endpoint (posts multipart image or camera_id)
    path('capture-webcam/', ProcessFrameView.as_view(), name='ai-capture-webcam'),
    path('tts/', KhmerTTSView.as_view(), name='ai-tts'),
    path('logs/', DetectionLogListView.as_view(), name='ai-logs'),
    path('logs/export/', DetectionLogExportView.as_view(), name='ai-logs-export'),
    path('logs/<uuid:pk>/', DetectionLogDetailView.as_view(), name='ai-log-detail'),
    path('logs/<uuid:pk>/review/', DetectionLogReviewView.as_view(), name='ai-log-review'),
    path('stats/', DetectionPageStatsView.as_view(), name='ai-page-stats'),
    path('ocr-training/', OcrTrainingStatusView.as_view(), name='ai-ocr-training-status'),
    path('ocr-training/prereq/', OcrTrainingPrereqView.as_view(), name='ai-ocr-training-prereq'),
    path('ocr-training/baseline/', OcrTrainingBaselineView.as_view(), name='ai-ocr-training-baseline'),
    path('ocr-training/edge-cases/', OcrTrainingEdgeCasesView.as_view(), name='ai-ocr-training-edge'),
]
