"""Citizen Service domain URL facade — /api/v1/citizen/"""
from django.urls import path

from appeals.views import AppealListCreateView
from authentication.views import ProfileView
from dashboard.views import DriverDashboardView
from domains.catalog_views import DomainCatalogView
from fines.views import FineDetailView, FineListCreateView, FinePaymentView, PaymentConfigView
from notifications.views import NotificationListView
from vehicles.views import VehicleDetailView, VehicleListCreateView
from violations.views import ViolationDetailView, ViolationListCreateView

urlpatterns = [
    path('', DomainCatalogView.as_view(), {'domain': 'citizen'}, name='domain-citizen-catalog'),
    path('dashboard/', DriverDashboardView.as_view(), name='domain-citizen-dashboard'),
    path('profile/', ProfileView.as_view(), name='domain-citizen-profile'),
    path('vehicles/', VehicleListCreateView.as_view(), name='domain-citizen-vehicles'),
    path('vehicles/<uuid:pk>/', VehicleDetailView.as_view(), name='domain-citizen-vehicle-detail'),
    path('violations/', ViolationListCreateView.as_view(), name='domain-citizen-violations'),
    path('violations/<uuid:pk>/', ViolationDetailView.as_view(), name='domain-citizen-violation-detail'),
    path('fines/', FineListCreateView.as_view(), name='domain-citizen-fines'),
    path('fines/payment-config/', PaymentConfigView.as_view(), name='domain-citizen-payment-config'),
    path('fines/<uuid:pk>/', FineDetailView.as_view(), name='domain-citizen-fine-detail'),
    path('fines/<uuid:pk>/pay/', FinePaymentView.as_view(), name='domain-citizen-fine-pay'),
    path('appeals/', AppealListCreateView.as_view(), name='domain-citizen-appeals'),
    path('notifications/', NotificationListView.as_view(), name='domain-citizen-notifications'),
]
