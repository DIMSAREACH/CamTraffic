"""CamTraffic URL configuration."""
import os

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

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

# Always mount local MEDIA_ROOT at /media/ when enabled — do not use settings.MEDIA_URL
# here because USE_S3_MEDIA rewrites MEDIA_URL to an absolute R2 host and would skip serving.
_serve_media = bool(getattr(settings, 'SERVE_MEDIA', True)) or bool(settings.DEBUG)
if _serve_media:
    urlpatterns += [
        re_path(
            r'^media/(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
