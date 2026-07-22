"""Shared API route table — mounted at /api/ and /api/v1/."""
from django.conf import settings
from django.urls import include, path

from ai_detection.detect_alias_urls import detections_urlpatterns
from core.health_views import ApiCatalogView, HealthView
from core.media_proxy import MediaProxyView

urlpatterns = [
    path('catalog/', ApiCatalogView.as_view(), name='api-catalog'),
    path('health/', HealthView.as_view(), name='api-health'),
    path('media/proxy/', MediaProxyView.as_view(), name='media-proxy'),
    path('auth/', include('authentication.urls')),
    # Enterprise multi-domain namespaces (Administration / Traffic Ops / Citizen)
    path('', include('domains.urls')),
    path('users/', include('users.urls')),
    path('officers/', include('users.officers_urls')),
    path('drivers/', include('users.drivers_urls')),
    path('rbac/', include('rbac.urls')),
    path('vehicles/', include('vehicles.urls')),
    path('datasets/', include('datasets.urls')),
    path('settings/', include('core.settings_urls')),
    path('signs/', include('traffic_signs.urls')),
    path('fines/', include('fines.urls')),
    path('appeals/', include('appeals.urls')),
    path('audit/', include('audit.urls')),
    path('unknown-vehicles/', include('unknown_vehicles.urls')),
    path('ai-models/', include('ai_models.urls')),
    path('ocr/', include('ai_detection.ocr_urls')),
    path('', include('violations.urls')),
    path('detection/', include('ai_detection.detection_urls')),
    path('detect/', include('ai_detection.detect_alias_urls')),
    path('detections/', include(detections_urlpatterns)),
    path('ai/', include('ai_detection.urls')),
    path('notifications/', include('notifications.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('reports/', include('dashboard.reports_urls')),
    path('mobile/', include('mobile_api.urls')),
    path('imports/', include('imports.urls')),
    path('', include('infrastructure.urls')),
]

if getattr(settings, 'ENABLE_API_DOCS', False):
    from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

    urlpatterns += [
        path('schema/', SpectacularAPIView.as_view(), name='api-schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='api-schema'), name='api-swagger'),
        path('redoc/', SpectacularRedocView.as_view(url_name='api-schema'), name='api-redoc'),
    ]
