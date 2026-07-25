from django.urls import path

from .views import (
    AdminAIDashboardView,
    AdminDashboardView,
    AdminDetectionAnalyticsView,
    AdminDriverAnalyticsView,
    AdminHeatmapView,
    AdminOfficerPerformanceView,
    AdminReportPDFView,
    AdminSystemBackupListView,
    AdminSystemBackupRestoreView,
    AdminSystemBackupView,
    DriverDashboardView,
    EnforcementMonthlyExcelView,
    EvidenceArchiveView,
    PoliceDashboardView,
    PoliceReportPDFView,
    PoliceReportsView,
)

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='dashboard-admin'),
    path('admin/ai/', AdminAIDashboardView.as_view(), name='dashboard-admin-ai'),
    path('admin/analytics/detections/', AdminDetectionAnalyticsView.as_view(), name='dashboard-admin-detection-analytics'),
    path('admin/analytics/heatmap/', AdminHeatmapView.as_view(), name='dashboard-admin-heatmap'),
    path('admin/analytics/officers/', AdminOfficerPerformanceView.as_view(), name='dashboard-admin-officers'),
    path('admin/analytics/drivers/', AdminDriverAnalyticsView.as_view(), name='dashboard-admin-drivers'),
    path('admin/report/pdf/', AdminReportPDFView.as_view(), name='dashboard-admin-report-pdf'),
    path('admin/backup/', AdminSystemBackupView.as_view(), name='dashboard-admin-backup'),
    path('admin/backups/', AdminSystemBackupListView.as_view(), name='dashboard-admin-backups'),
    path('admin/backups/<str:filename>/restore/', AdminSystemBackupRestoreView.as_view(), name='dashboard-admin-backup-restore'),
    path('police/', PoliceDashboardView.as_view(), name='dashboard-police'),
    path('police/reports/', PoliceReportsView.as_view(), name='dashboard-police-reports'),
    path('police/reports/pdf/', PoliceReportPDFView.as_view(), name='dashboard-police-report-pdf'),
    path('enforcement/export.xlsx/', EnforcementMonthlyExcelView.as_view(), name='dashboard-enforcement-excel'),
    path('evidence/', EvidenceArchiveView.as_view(), name='dashboard-evidence-archive'),
    path('driver/', DriverDashboardView.as_view(), name='dashboard-driver'),
]
