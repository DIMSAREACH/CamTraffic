from django.urls import path

from . import views

app_name = 'integration'

urlpatterns = [
    path(
        'cameras/<int:camera_id>/process-frame/',
        views.CameraProcessFrameView.as_view(),
        name='camera-process-frame',
    ),
    path(
        'ai-status/',
        views.AIServiceStatusView.as_view(),
        name='ai-status',
    ),
    path(
        'detections/live-feed/',
        views.DetectionLiveFeedSSEView.as_view(),
        name='detection-live-feed',
    ),
]
