from django.urls import path

from .views import (
    BulkViolationApprovalView,
    BulkViolationRejectionView,
    ViolationDetailView,
    ViolationEvaluateView,
    ViolationListCreateView,
    ViolationRuleDetailView,
    ViolationRuleListView,
    ViolationSeedRulesView,
    ViolationStatsView,
)
from .map_views import ViolationHeatmapView, ViolationMapView

urlpatterns = [
    path('violations/', ViolationListCreateView.as_view(), name='violation-list'),
    path('violations/evaluate/', ViolationEvaluateView.as_view(), name='violation-evaluate'),
    path('violations/stats/', ViolationStatsView.as_view(), name='violation-stats'),
    path('violations/rules/', ViolationRuleListView.as_view(), name='violation-rules'),
    path('violations/rules/<uuid:pk>/', ViolationRuleDetailView.as_view(), name='violation-rule-detail'),
    path('violations/seed-rules/', ViolationSeedRulesView.as_view(), name='violation-seed-rules'),
    path('violations/bulk-approve/', BulkViolationApprovalView.as_view(), name='violation-bulk-approve'),
    path('violations/bulk-reject/', BulkViolationRejectionView.as_view(), name='violation-bulk-reject'),
    
    # Map and heatmap views
    path('violations/map/', ViolationMapView.as_view(), name='violation-map'),
    path('violations/heatmap/', ViolationHeatmapView.as_view(), name='violation-heatmap'),
    
    path('violations/<uuid:pk>/', ViolationDetailView.as_view(), name='violation-detail'),
]
