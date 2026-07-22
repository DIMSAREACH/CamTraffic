from django.urls import path

from .views import ClearReadNotificationsView, MarkReadView, NotificationListView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read/', MarkReadView.as_view(), name='notification-read-all'),
    path('clear-read/', ClearReadNotificationsView.as_view(), name='notification-clear-read'),
    path('<uuid:pk>/read/', MarkReadView.as_view(), name='notification-read'),
]
