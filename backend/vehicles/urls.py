from django.urls import path

from .owner_views import VehicleOwnerDetailView, VehicleOwnerListView, VehicleOwnerReassignView
from .views import VehicleDetailView, VehicleListCreateView, VehicleSearchView

urlpatterns = [
    path('', VehicleListCreateView.as_view(), name='vehicle-list'),
    path('search/', VehicleSearchView.as_view(), name='vehicle-search'),
    path('owners/', VehicleOwnerListView.as_view(), name='vehicle-owner-list'),
    path('owners/reassign/', VehicleOwnerReassignView.as_view(), name='vehicle-owner-reassign'),
    path('owners/<uuid:owner_id>/', VehicleOwnerDetailView.as_view(), name='vehicle-owner-detail'),
    path('<uuid:pk>/', VehicleDetailView.as_view(), name='vehicle-detail'),
]
