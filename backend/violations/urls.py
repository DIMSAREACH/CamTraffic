from django.urls import path

from .views import (
    ViolationDetailView,
    ViolationEvaluateView,
    ViolationListCreateView,
    ViolationRuleListView,
    ViolationSeedRulesView,
    ViolationStatsView,
)

urlpatterns = [
    path('violations/', ViolationListCreateView.as_view(), name='violation-list'),
    path('violations/evaluate/', ViolationEvaluateView.as_view(), name='violation-evaluate'),
    path('violations/stats/', ViolationStatsView.as_view(), name='violation-stats'),
    path('violations/rules/', ViolationRuleListView.as_view(), name='violation-rules'),
    path('violations/seed-rules/', ViolationSeedRulesView.as_view(), name='violation-seed-rules'),
    path('violations/<int:pk>/', ViolationDetailView.as_view(), name='violation-detail'),
]
