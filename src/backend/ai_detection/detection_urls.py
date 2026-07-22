"""Thesis-friendly detection routes — aliases over ai_detection views."""
from django.urls import path

from .views import (
    DetectSignView,
    DetectVideoView,
    DetectionHubView,
    DetectionWebcamView,
    ProcessFrameView,
)

urlpatterns = [
    path('', DetectionHubView.as_view(), name='detection-hub'),
    path('image/', DetectSignView.as_view(), name='detection-image'),
    path('video/', DetectVideoView.as_view(), name='detection-video'),
    path('webcam/', DetectionWebcamView.as_view(), name='detection-webcam'),
    path('live/', ProcessFrameView.as_view(), name='detection-live'),
]
