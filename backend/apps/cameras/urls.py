from django.urls import path

from . import views

app_name = 'cameras'

urlpatterns = [
    path('management/', views.CameraListCreateView.as_view(), name='management-list'),
    path('management/<int:camera_id>/', views.CameraDetailView.as_view(), name='management-detail'),
    path('live-dashboard/', views.CameraLiveDashboardView.as_view(), name='live-dashboard'),
    path('officer/live/', views.OfficerLiveCameraView.as_view(), name='officer-live-camera'),
    path('health/', views.CameraHealthMonitoringView.as_view(), name='health-monitoring'),
    path('health/check-all/', views.CameraHealthCheckAllView.as_view(), name='health-check-all'),
    path('health/<int:camera_id>/check/', views.CameraHealthCheckView.as_view(), name='health-check'),
]
