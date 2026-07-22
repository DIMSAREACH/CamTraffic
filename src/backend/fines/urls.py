from django.urls import path

from .views import (
    DriverLookupView,
    FineDetailView,
    FineKhqrSessionView,
    FineListCreateView,
    FinePaymentView,
    FinePDFExportView,
    FineStripeCheckoutView,
    FineVerifyPaymentView,
    PaymentConfigView,
    StripeWebhookView,
)

urlpatterns = [
    path('', FineListCreateView.as_view(), name='fine-list'),
    path('lookup/', DriverLookupView.as_view(), name='driver-lookup'),
    path('payment-config/', PaymentConfigView.as_view(), name='payment-config'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('<uuid:pk>/', FineDetailView.as_view(), name='fine-detail'),
    path('<uuid:pk>/pay/', FinePaymentView.as_view(), name='fine-pay'),
    path('<uuid:pk>/verify-payment/', FineVerifyPaymentView.as_view(), name='fine-verify-payment'),
    path('<uuid:pk>/checkout/stripe/', FineStripeCheckoutView.as_view(), name='fine-stripe-checkout'),
    path('<uuid:pk>/checkout/khqr/', FineKhqrSessionView.as_view(), name='fine-khqr-session'),
    path('<uuid:pk>/pdf/', FinePDFExportView.as_view(), name='fine-pdf'),
]
