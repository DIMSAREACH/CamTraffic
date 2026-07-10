from django.urls import path

from . import views

app_name = 'audit'

urlpatterns = [
    path('logs/summary/', views.AuditLogSummaryView.as_view(), name='audit-log-summary'),
    path('logs/', views.AuditLogListView.as_view(), name='audit-log-list'),
    path('login-history/', views.LoginHistoryListView.as_view(), name='login-history-list'),
]
