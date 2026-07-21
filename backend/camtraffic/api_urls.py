"""Shared API route table — mounted at /api/ and /api/v1/."""
from django.conf import settings
from django.urls import include, path

from core.health_views import ApiCatalogView, HealthView

urlpatterns = [
    path('catalog/', ApiCatalogView.as_view(), name='api-catalog'),
    path('health/', HealthView.as_view(), name='api-health'),
    path('auth/', include('authentication.urls')),
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
    path('ai/', include('ai_detection.urls')),
    path('notifications/', include('notifications.urls')),
    path('dashboard/', include('dashboard.urls')),
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
