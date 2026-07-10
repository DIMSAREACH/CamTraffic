from django.urls import path

from . import views

app_name = 'detections'

urlpatterns = [
    path('monitoring/', views.DetectionMonitorListView.as_view(), name='monitoring-list'),
    path('monitoring/summary/', views.DetectionMonitorSummaryView.as_view(), name='monitoring-summary'),
    path('monitoring/<int:detection_id>/', views.DetectionMonitorDetailView.as_view(), name='monitoring-detail'),
    path('officer/monitoring/', views.OfficerLiveDetectionListView.as_view(), name='officer-monitoring-list'),
    path('officer/monitoring/summary/', views.OfficerLiveDetectionSummaryView.as_view(), name='officer-monitoring-summary'),
    path('officer/monitoring/<int:detection_id>/', views.OfficerLiveDetectionDetailView.as_view(), name='officer-monitoring-detail'),
    path('officer/cameras/', views.OfficerLiveDetectionCameraOptionsView.as_view(), name='officer-monitoring-cameras'),
]
