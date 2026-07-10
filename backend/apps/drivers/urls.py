from django.urls import path

from . import views

app_name = 'drivers'

urlpatterns = [
    path('officer/management/', views.OfficerDriverListCreateView.as_view(), name='officer-management-list'),
    path(
        'officer/management/<int:driver_id>/',
        views.OfficerDriverDetailView.as_view(),
        name='officer-management-detail',
    ),
    path('driver/profile/', views.DriverProfileView.as_view(), name='driver-profile'),
    path('driver/settings/', views.DriverSettingsView.as_view(), name='driver-settings'),
]
