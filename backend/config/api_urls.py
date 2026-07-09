from django.urls import include, path

app_name = 'api-v1'

urlpatterns = [
    path('', include('apps.core.urls')),
    path('auth/', include('apps.accounts.urls')),
    path('users/', include('apps.users.urls')),
    path('rbac/', include('apps.rbac.urls')),
    path('officers/', include('apps.officers.urls')),
    path('drivers/', include('apps.drivers.urls')),
    path('vehicles/', include('apps.vehicles.urls')),
    path('cameras/', include('apps.cameras.urls')),
    path('traffic-signs/', include('apps.traffic_signs.urls')),
    path('ai-models/', include('apps.ai_models.urls')),
    path('detections/', include('apps.detections.urls')),
    path('ocr/', include('apps.ocr.urls')),
    path('violations/', include('apps.violations.urls')),
    path('fines/', include('apps.fines.urls')),
    path('appeals/', include('apps.appeals.urls')),
    path('reports/', include('apps.reports.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('dashboard/', include('apps.dashboard.urls')),
    path('audit/', include('apps.audit.urls')),
    path('system/', include('apps.system.urls')),
    path('integration/', include('apps.integration.urls')),
]
