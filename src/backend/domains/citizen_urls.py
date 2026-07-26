"""Citizen Service domain URL facade — /api/v1/citizen/"""
from django.urls import path

from appeals.views import AppealListCreateView
from authentication.views import ProfileView
from dashboard.views import DriverDashboardView
from domains.catalog_views import DomainCatalogView
from fines.installment_views import (
    CalculateInstallmentQuoteView,
    CreateInstallmentPlanView,
    GetDriverInstallmentsView,
    GetInstallmentPlanView,
    PayInstallmentView,
)
from fines.pdf_views import DownloadFineReceiptView
from fines.views import (
    FineDetailView,
    FineKhqrSessionView,
    FineListCreateView,
    FinePaymentView,
    FineStripeCheckoutView,
    PaymentConfigView,
)
from notifications.views import ClearReadNotificationsView, MarkReadView, NotificationListView
from vehicles.views import VehicleDetailView, VehicleListCreateView
from violations.map_views import ViolationHeatmapView, ViolationMapView
from violations.views import ViolationDetailView, ViolationListCreateView

urlpatterns = [
    path('', DomainCatalogView.as_view(), {'domain': 'citizen'}, name='domain-citizen-catalog'),
    path('dashboard/', DriverDashboardView.as_view(), name='domain-citizen-dashboard'),
    path('profile/', ProfileView.as_view(), name='domain-citizen-profile'),
    path('vehicles/', VehicleListCreateView.as_view(), name='domain-citizen-vehicles'),
    path('vehicles/<uuid:pk>/', VehicleDetailView.as_view(), name='domain-citizen-vehicle-detail'),
    path('violations/', ViolationListCreateView.as_view(), name='domain-citizen-violations'),
    path('violations/map/', ViolationMapView.as_view(), name='domain-citizen-violations-map'),
    path('violations/heatmap/', ViolationHeatmapView.as_view(), name='domain-citizen-violations-heatmap'),
    path('violations/<uuid:pk>/', ViolationDetailView.as_view(), name='domain-citizen-violation-detail'),
    path('fines/', FineListCreateView.as_view(), name='domain-citizen-fines'),
    path('fines/payment-config/', PaymentConfigView.as_view(), name='domain-citizen-payment-config'),
    path('fines/installments/', GetDriverInstallmentsView.as_view(), name='domain-citizen-driver-installments'),
    path('fines/<uuid:pk>/', FineDetailView.as_view(), name='domain-citizen-fine-detail'),
    path('fines/<uuid:pk>/pay/', FinePaymentView.as_view(), name='domain-citizen-fine-pay'),
    path('fines/<uuid:pk>/checkout/stripe/', FineStripeCheckoutView.as_view(), name='domain-citizen-fine-stripe'),
    path('fines/<uuid:pk>/checkout/khqr/', FineKhqrSessionView.as_view(), name='domain-citizen-fine-khqr'),
    path('fines/<uuid:fine_id>/receipt/pdf/', DownloadFineReceiptView.as_view(), name='domain-citizen-fine-receipt'),
    path('fines/<uuid:fine_id>/installments/quote/', CalculateInstallmentQuoteView.as_view(), name='domain-citizen-installment-quote'),
    path('fines/<uuid:fine_id>/installments/create/', CreateInstallmentPlanView.as_view(), name='domain-citizen-installment-create'),
    path('fines/<uuid:fine_id>/installments/', GetInstallmentPlanView.as_view(), name='domain-citizen-installment-plan'),
    path('fines/installments/<uuid:payment_id>/pay/', PayInstallmentView.as_view(), name='domain-citizen-installment-pay'),
    path('appeals/', AppealListCreateView.as_view(), name='domain-citizen-appeals'),
    path('notifications/', NotificationListView.as_view(), name='domain-citizen-notifications'),
    path('notifications/read/', MarkReadView.as_view(), name='domain-citizen-notifications-read-all'),
    path('notifications/clear-read/', ClearReadNotificationsView.as_view(), name='domain-citizen-notifications-clear'),
    path('notifications/<uuid:pk>/read/', MarkReadView.as_view(), name='domain-citizen-notification-read'),
]
