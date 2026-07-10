from django.urls import path

from . import views

app_name = 'dashboard'

urlpatterns = [
    path('stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('charts/', views.DashboardChartsView.as_view(), name='dashboard-charts'),
    path('activities/', views.DashboardActivitiesView.as_view(), name='dashboard-activities'),
    path('ai-summary/', views.DashboardAiSummaryView.as_view(), name='dashboard-ai-summary'),
    path('camera-status/', views.DashboardCameraStatusView.as_view(), name='dashboard-camera-status'),
    path('notifications/', views.DashboardNotificationCenterView.as_view(), name='dashboard-notifications'),
    path('analytics/', views.DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('officer/stats/', views.OfficerDashboardStatsView.as_view(), name='officer-dashboard-stats'),
    path('officer/charts/', views.OfficerDashboardChartsView.as_view(), name='officer-dashboard-charts'),
    path('officer/activities/', views.OfficerDashboardActivitiesView.as_view(), name='officer-dashboard-activities'),
    path('officer/camera-status/', views.OfficerDashboardCameraStatusView.as_view(), name='officer-dashboard-camera-status'),
    path('officer/notifications/', views.OfficerDashboardNotificationCenterView.as_view(), name='officer-dashboard-notifications'),
    path('driver/stats/', views.DriverDashboardStatsView.as_view(), name='driver-dashboard-stats'),
    path('driver/charts/', views.DriverDashboardChartsView.as_view(), name='driver-dashboard-charts'),
    path('driver/activities/', views.DriverDashboardActivitiesView.as_view(), name='driver-dashboard-activities'),
    path('driver/notifications/', views.DriverDashboardNotificationCenterView.as_view(), name='driver-dashboard-notifications'),
]
