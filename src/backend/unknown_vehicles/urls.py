from django.urls import path

from .views import UnknownVehicleListView, UnknownVehicleResolveView

urlpatterns = [
    path('', UnknownVehicleListView.as_view(), name='unknown-vehicle-list'),
    path('<uuid:pk>/resolve/', UnknownVehicleResolveView.as_view(), name='unknown-vehicle-resolve'),
]
