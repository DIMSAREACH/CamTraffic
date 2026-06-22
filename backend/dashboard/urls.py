from django.urls import path

from .views import (
    AdminDashboardView,
    AdminReportPDFView,
    AdminSystemBackupListView,
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
    path('admin/report/pdf/', AdminReportPDFView.as_view(), name='dashboard-admin-report-pdf'),
    path('admin/backup/', AdminSystemBackupView.as_view(), name='dashboard-admin-backup'),
    path('admin/backups/', AdminSystemBackupListView.as_view(), name='dashboard-admin-backups'),
    path('police/', PoliceDashboardView.as_view(), name='dashboard-police'),
    path('police/reports/', PoliceReportsView.as_view(), name='dashboard-police-reports'),
    path('police/reports/pdf/', PoliceReportPDFView.as_view(), name='dashboard-police-report-pdf'),
    path('enforcement/export.xlsx/', EnforcementMonthlyExcelView.as_view(), name='dashboard-enforcement-excel'),
    path('evidence/', EvidenceArchiveView.as_view(), name='dashboard-evidence-archive'),
    path('driver/', DriverDashboardView.as_view(), name='dashboard-driver'),
]
