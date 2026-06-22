from django.urls import path

from .views import DetectSignView, DetectionLogExportView, DetectionLogListView, DetectionPageStatsView, KhmerTTSView

urlpatterns = [
    path('detect/', DetectSignView.as_view(), name='ai-detect'),
    path('tts/', KhmerTTSView.as_view(), name='ai-tts'),
    path('logs/', DetectionLogListView.as_view(), name='ai-logs'),
    path('logs/export/', DetectionLogExportView.as_view(), name='ai-logs-export'),
    path('stats/', DetectionPageStatsView.as_view(), name='ai-page-stats'),
]
