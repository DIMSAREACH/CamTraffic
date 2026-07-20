"""CamTraffic URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.health_views import ApiRootView, HealthReadyView, HealthView, MonitoringStatusView

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),
    path('admin/', admin.site.urls),
    path('health/', HealthView.as_view(), name='health'),
    path('health/ready/', HealthReadyView.as_view(), name='health-ready'),
    path('health/status/', MonitoringStatusView.as_view(), name='monitoring-status'),
    path('api/', include('camtraffic.api_urls')),
    path('api/v1/', include('camtraffic.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
