from django.urls import path

from .views import MarkReadView, NotificationListView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read/', MarkReadView.as_view(), name='notification-read-all'),
    path('<int:pk>/read/', MarkReadView.as_view(), name='notification-read'),
]
