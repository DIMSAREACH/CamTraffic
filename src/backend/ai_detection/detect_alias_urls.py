"""PRD short aliases: /api/detect/* and /api/detections → existing AI detection views."""
from django.urls import path

from .views import (
    DetectSignView,
    DetectVideoView,
    DetectionLogDetailView,
    DetectionLogListView,
    DetectionWebcamView,
    ProcessFrameView,
)

urlpatterns = [
    path('image/', DetectSignView.as_view(), name='prd-detect-image'),
    path('video/', DetectVideoView.as_view(), name='prd-detect-video'),
    path('webcam/', DetectionWebcamView.as_view(), name='prd-detect-webcam'),
    path('live/', ProcessFrameView.as_view(), name='prd-detect-live'),
]

detections_urlpatterns = [
    path('', DetectionLogListView.as_view(), name='prd-detections-list'),
    path('<uuid:pk>/', DetectionLogDetailView.as_view(), name='prd-detections-detail'),
]
