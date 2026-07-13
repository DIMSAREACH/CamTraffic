from django.urls import path

from .officer_views import (
    OfficerDetailView,
    OfficerListCreateView,
    PoliceStationDetailView,
    PoliceStationListCreateView,
)

urlpatterns = [
    path('', OfficerListCreateView.as_view(), name='officer-list'),
    path('<uuid:pk>/', OfficerDetailView.as_view(), name='officer-detail'),
    path('stations/', PoliceStationListCreateView.as_view(), name='police-station-list'),
    path('stations/<uuid:pk>/', PoliceStationDetailView.as_view(), name='police-station-detail'),
]
