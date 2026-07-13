from django.urls import path

from .settings_views import SystemSettingDetailView, SystemSettingListView

urlpatterns = [
    path('', SystemSettingListView.as_view(), name='system-settings-list'),
    path('<str:key>/', SystemSettingDetailView.as_view(), name='system-settings-detail'),
]
