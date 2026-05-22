from django.urls import path

from .views import VehicleDetailView, VehicleListCreateView, VehicleSearchView

urlpatterns = [
    path('', VehicleListCreateView.as_view(), name='vehicle-list'),
    path('search/', VehicleSearchView.as_view(), name='vehicle-search'),
    path('<int:pk>/', VehicleDetailView.as_view(), name='vehicle-detail'),
]
