from django.urls import path

from . import views

app_name = 'reports'

urlpatterns = [
    path('catalog/', views.ReportCatalogView.as_view(), name='catalog'),
    path('exports/', views.ReportExportListCreateView.as_view(), name='export-list'),
    path('exports/<int:export_id>/', views.ReportExportDetailView.as_view(), name='export-detail'),
    path('officer/catalog/', views.OfficerReportCatalogView.as_view(), name='officer-catalog'),
    path('officer/exports/', views.OfficerReportExportListCreateView.as_view(), name='officer-export-list'),
    path(
        'officer/exports/<int:export_id>/',
        views.OfficerReportExportDetailView.as_view(),
        name='officer-export-detail',
    ),
]
