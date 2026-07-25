from django.urls import path

from .officer_views import DriverDetailView, DriverListCreateView

urlpatterns = [
    path('', DriverListCreateView.as_view(), name='driver-list'),
    path('<uuid:pk>/', DriverDetailView.as_view(), name='driver-detail'),
]
