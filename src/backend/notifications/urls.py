from django.urls import path

from .views import ClearReadNotificationsView, MarkReadView, NotificationListView
from .push_views import (
    ListPushDevicesView,
    RegisterPushDeviceView,
    UnregisterPushDeviceView,
)
from .admin_views import (
    AdminNotificationBroadcastView,
    AdminNotificationDetailView,
    AdminNotificationListView,
)
from .schedule_views import (
    ChannelStatusView,
    NotificationTemplateDetailView,
    NotificationTemplateListCreateView,
    RunDueSchedulesView,
    ScheduledNotificationDetailView,
    ScheduledNotificationListCreateView,
    ScheduledReportDetailView,
    ScheduledReportListCreateView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read/', MarkReadView.as_view(), name='notification-read-all'),
    path('clear-read/', ClearReadNotificationsView.as_view(), name='notification-clear-read'),

    # Admin — specific paths BEFORE <uuid> catch-all
    path('admin/', AdminNotificationListView.as_view(), name='notification-admin-list'),
    path('admin/broadcast/', AdminNotificationBroadcastView.as_view(), name='notification-admin-broadcast'),
    path('admin/channels/', ChannelStatusView.as_view(), name='notification-channel-status'),
    path('admin/templates/', NotificationTemplateListCreateView.as_view(), name='notification-templates'),
    path('admin/templates/<uuid:pk>/', NotificationTemplateDetailView.as_view(), name='notification-template-detail'),
    path('admin/schedules/', ScheduledNotificationListCreateView.as_view(), name='notification-schedules'),
    path('admin/schedules/<uuid:pk>/', ScheduledNotificationDetailView.as_view(), name='notification-schedule-detail'),
    path('admin/report-schedules/', ScheduledReportListCreateView.as_view(), name='report-schedules'),
    path('admin/report-schedules/<uuid:pk>/', ScheduledReportDetailView.as_view(), name='report-schedule-detail'),
    path('admin/run-due/', RunDueSchedulesView.as_view(), name='notification-run-due'),
    path('admin/<uuid:pk>/', AdminNotificationDetailView.as_view(), name='notification-admin-detail'),

    path('<uuid:pk>/read/', MarkReadView.as_view(), name='notification-read'),

    path('push/register/', RegisterPushDeviceView.as_view(), name='push-register'),
    path('push/unregister/', UnregisterPushDeviceView.as_view(), name='push-unregister'),
    path('push/devices/', ListPushDevicesView.as_view(), name='push-devices'),
]
