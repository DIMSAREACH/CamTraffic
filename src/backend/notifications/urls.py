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

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read/', MarkReadView.as_view(), name='notification-read-all'),
    path('clear-read/', ClearReadNotificationsView.as_view(), name='notification-clear-read'),
    path('<uuid:pk>/read/', MarkReadView.as_view(), name='notification-read'),

    # Admin oversight / broadcast (real DB — no frontend catalog)
    path('admin/', AdminNotificationListView.as_view(), name='notification-admin-list'),
    path('admin/broadcast/', AdminNotificationBroadcastView.as_view(), name='notification-admin-broadcast'),
    path('admin/<uuid:pk>/', AdminNotificationDetailView.as_view(), name='notification-admin-detail'),

    # Push notification device management
    path('push/register/', RegisterPushDeviceView.as_view(), name='push-register'),
    path('push/unregister/', UnregisterPushDeviceView.as_view(), name='push-unregister'),
    path('push/devices/', ListPushDevicesView.as_view(), name='push-devices'),
]
