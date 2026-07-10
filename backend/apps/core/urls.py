from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('health/', views.api_health, name='api-health'),
    path('monitoring/status/', views.monitoring_status, name='monitoring-status'),
]
