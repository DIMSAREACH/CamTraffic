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
from .pdf_views import DownloadFineReceiptView, DownloadMultipleFineReceiptsView
from .installment_views import (
    CalculateInstallmentQuoteView,
    CreateInstallmentPlanView,
    GetDriverInstallmentsView,
    GetInstallmentPlanView,
    PayInstallmentView,
)

urlpatterns = [
    path('', FineListCreateView.as_view(), name='fine-list'),
    path('lookup/', DriverLookupView.as_view(), name='driver-lookup'),
    path('payment-config/', PaymentConfigView.as_view(), name='payment-config'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    
    # PDF receipts
    path('receipts/pdf/', DownloadMultipleFineReceiptsView.as_view(), name='fine-receipts-pdf'),
    
    # Installment plans
    path('installments/', GetDriverInstallmentsView.as_view(), name='driver-installments'),
    
    path('<uuid:pk>/', FineDetailView.as_view(), name='fine-detail'),
    path('<uuid:pk>/pay/', FinePaymentView.as_view(), name='fine-pay'),
    path('<uuid:pk>/verify-payment/', FineVerifyPaymentView.as_view(), name='fine-verify-payment'),
    path('<uuid:pk>/checkout/stripe/', FineStripeCheckoutView.as_view(), name='fine-stripe-checkout'),
    path('<uuid:pk>/checkout/khqr/', FineKhqrSessionView.as_view(), name='fine-khqr-session'),
    path('<uuid:pk>/pdf/', FinePDFExportView.as_view(), name='fine-pdf'),
    
    # PDF receipt download
    path('<uuid:fine_id>/receipt/pdf/', DownloadFineReceiptView.as_view(), name='fine-receipt-pdf'),
    
    # Installments for specific fine
    path('<uuid:fine_id>/installments/quote/', CalculateInstallmentQuoteView.as_view(), name='fine-installment-quote'),
    path('<uuid:fine_id>/installments/create/', CreateInstallmentPlanView.as_view(), name='fine-installment-create'),
    path('<uuid:fine_id>/installments/', GetInstallmentPlanView.as_view(), name='fine-installment-plan'),
]

# Installment payment endpoints (separate from fines)
installment_patterns = [
    path('installments/<uuid:payment_id>/pay/', PayInstallmentView.as_view(), name='installment-pay'),
]

urlpatterns += installment_patterns
