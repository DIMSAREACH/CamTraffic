from django.urls import path

from . import views

app_name = 'officers'

urlpatterns = [
    path('stations/', views.PoliceStationCatalogView.as_view(), name='station-catalog'),
    path('stations/manage/', views.PoliceStationListCreateView.as_view(), name='station-list-create'),
    path('stations/manage/<int:station_id>/', views.PoliceStationDetailView.as_view(), name='station-detail'),
    path('management/', views.OfficerListCreateView.as_view(), name='officer-list-create'),
    path('management/<int:officer_id>/', views.OfficerDetailView.as_view(), name='officer-detail'),
    path('officer/profile/', views.OfficerProfileView.as_view(), name='officer-profile'),
]
