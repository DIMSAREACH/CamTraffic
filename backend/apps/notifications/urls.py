from django.urls import path

from . import views

app_name = 'notifications'

urlpatterns = [
    path('templates/manage/', views.NotificationTemplateListCreateView.as_view(), name='template-manage'),
    path(
        'templates/manage/<int:template_id>/',
        views.NotificationTemplateDetailView.as_view(),
        name='template-detail',
    ),
    path('officer/summary/', views.OfficerNotificationSummaryView.as_view(), name='officer-summary'),
    path('officer/', views.OfficerNotificationListView.as_view(), name='officer-list'),
    path('officer/read-all/', views.OfficerNotificationReadAllView.as_view(), name='officer-read-all'),
    path('officer/<int:notification_id>/', views.OfficerNotificationDetailView.as_view(), name='officer-detail'),
    path('driver/summary/', views.DriverNotificationSummaryView.as_view(), name='driver-summary'),
    path('driver/', views.DriverNotificationListView.as_view(), name='driver-list'),
    path('driver/read-all/', views.DriverNotificationReadAllView.as_view(), name='driver-read-all'),
    path('driver/<int:notification_id>/', views.DriverNotificationDetailView.as_view(), name='driver-detail'),
]
