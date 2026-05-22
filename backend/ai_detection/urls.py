from django.urls import path

from .views import DetectSignView, DetectionLogListView, DetectionPageStatsView, KhmerTTSView

urlpatterns = [
    path('detect/', DetectSignView.as_view(), name='ai-detect'),
    path('tts/', KhmerTTSView.as_view(), name='ai-tts'),
    path('logs/', DetectionLogListView.as_view(), name='ai-logs'),
    path('stats/', DetectionPageStatsView.as_view(), name='ai-page-stats'),
]
