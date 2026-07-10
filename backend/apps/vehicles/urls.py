from django.urls import path

from . import views

app_name = 'vehicles'

urlpatterns = [
    path('officer/management/', views.OfficerVehicleListCreateView.as_view(), name='officer-management-list'),
    path(
        'officer/management/<int:vehicle_id>/',
        views.OfficerVehicleDetailView.as_view(),
        name='officer-management-detail',
    ),
    path('driver/mine/', views.DriverVehicleListView.as_view(), name='driver-vehicle-list'),
    path('driver/mine/<int:vehicle_id>/', views.DriverVehicleDetailView.as_view(), name='driver-vehicle-detail'),
]
