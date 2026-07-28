from django.urls import path

from .views import UnknownVehicleListView, UnknownVehicleQueueView, UnknownVehicleResolveView

urlpatterns = [
    path('', UnknownVehicleListView.as_view(), name='unknown-vehicle-list'),
    path('queue/', UnknownVehicleQueueView.as_view(), name='unknown-vehicle-queue'),
    path('<uuid:pk>/resolve/', UnknownVehicleResolveView.as_view(), name='unknown-vehicle-resolve'),
]
