from django.urls import path

from .views import AdminDashboardView, DriverDashboardView, PoliceDashboardView

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='dashboard-admin'),
    path('police/', PoliceDashboardView.as_view(), name='dashboard-police'),
    path('driver/', DriverDashboardView.as_view(), name='dashboard-driver'),
]
