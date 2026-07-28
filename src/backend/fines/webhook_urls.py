"""
Payment webhook URL configuration for automated settlement.
"""

from django.urls import path
from . import webhook_views

urlpatterns = [
    # Production payment webhooks
    path('stripe/', webhook_views.stripe_webhook, name='payment-webhook-stripe'),
    path('aba-payway/', webhook_views.aba_payway_webhook, name='payment-webhook-aba'),
    path('generic/', webhook_views.generic_payment_webhook, name='payment-webhook-generic'),
    # Status and monitoring
    path('status/', webhook_views.payment_settlement_status, name='payment-settlement-status'),
    # Development and testing (disabled in production)
    path('test/', webhook_views.test_webhook, name='payment-webhook-test'),
]
