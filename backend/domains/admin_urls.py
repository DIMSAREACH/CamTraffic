"""Administration domain URL facade — /api/v1/admin/"""
from django.urls import include, path

from dashboard.views import (
    AdminAIDashboardView,
    AdminDashboardView,
    AdminDetectionAnalyticsView,
    AdminDriverAnalyticsView,
    AdminHeatmapView,
    AdminOfficerPerformanceView,
    AdminReportPDFView,
)
from domains.catalog_views import DomainCatalogView
from infrastructure.views import CameraDetailView, CameraListCreateView, RoadListCreateView

urlpatterns = [
    path('', DomainCatalogView.as_view(), {'domain': 'admin'}, name='domain-admin-catalog'),
    path('dashboard/', AdminDashboardView.as_view(), name='domain-admin-dashboard'),
    path('dashboard/ai/', AdminAIDashboardView.as_view(), name='domain-admin-ai'),
    path('analytics/detections/', AdminDetectionAnalyticsView.as_view(), name='domain-admin-detections'),
    path('analytics/heatmap/', AdminHeatmapView.as_view(), name='domain-admin-heatmap'),
    path('analytics/officers/', AdminOfficerPerformanceView.as_view(), name='domain-admin-officers'),
    path('analytics/drivers/', AdminDriverAnalyticsView.as_view(), name='domain-admin-drivers'),
    path('reports/pdf/', AdminReportPDFView.as_view(), name='domain-admin-report-pdf'),
    path('users/', include('users.urls')),
    path('rbac/', include('rbac.urls')),
    path('cameras/', CameraListCreateView.as_view(), name='domain-admin-cameras'),
    path('cameras/<uuid:pk>/', CameraDetailView.as_view(), name='domain-admin-camera-detail'),
    path('roads/', RoadListCreateView.as_view(), name='domain-admin-roads'),
    path('traffic-signs/', include('traffic_signs.urls')),
    path('audit/', include('audit.urls')),
    path('ai-models/', include('ai_models.urls')),
    path('settings/', include('core.settings_urls')),
    path('reports/', include('dashboard.reports_urls')),
]
