"""Traffic Operations domain URL facade — /api/v1/officer/"""
from django.urls import include, path

from dashboard.views import EvidenceArchiveView, PoliceDashboardView, PoliceReportsView
from domains.catalog_views import DomainCatalogView
from domains.officer_views import (
    OfficerApproveViolationView,
    OfficerDetectionQueueView,
    OfficerIssueFineView,
    OfficerRejectViolationView,
)
from fines.views import DriverLookupView, FineDetailView, FineListCreateView
from infrastructure.views import CameraListCreateView, CameraLiveStatusView
from violations.views import ViolationDetailView, ViolationListCreateView

urlpatterns = [
    path('', DomainCatalogView.as_view(), {'domain': 'officer'}, name='domain-officer-catalog'),
    path('dashboard/', PoliceDashboardView.as_view(), name='domain-officer-dashboard'),
    path('detection-queue/', OfficerDetectionQueueView.as_view(), name='domain-officer-detection-queue'),
    path('violations/', ViolationListCreateView.as_view(), name='domain-officer-violations'),
    path('violations/<uuid:pk>/', ViolationDetailView.as_view(), name='domain-officer-violation-detail'),
    path('violations/<uuid:pk>/approve/', OfficerApproveViolationView.as_view(), name='domain-officer-approve'),
    path('violations/<uuid:pk>/reject/', OfficerRejectViolationView.as_view(), name='domain-officer-reject'),
    path('evidence/', EvidenceArchiveView.as_view(), name='domain-officer-evidence'),
    path('fines/', FineListCreateView.as_view(), name='domain-officer-fines'),
    path('fines/issue/', OfficerIssueFineView.as_view(), name='domain-officer-fines-issue'),
    path('fines/lookup/', DriverLookupView.as_view(), name='domain-officer-fines-lookup'),
    path('fines/<uuid:pk>/', FineDetailView.as_view(), name='domain-officer-fine-detail'),
    path('live-cameras/', CameraLiveStatusView.as_view(), name='domain-officer-live-cameras'),
    path('cameras/', CameraListCreateView.as_view(), name='domain-officer-cameras'),
    path('reports/', PoliceReportsView.as_view(), name='domain-officer-reports'),
    path('assigned-cases/', OfficerDetectionQueueView.as_view(), name='domain-officer-cases'),
    path('ai/', include('ai_detection.urls')),
]
