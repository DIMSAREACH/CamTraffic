"""Stripe Checkout for fine payments."""
from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)


def _stripe():
    import stripe

    stripe.api_key = (getattr(settings, 'STRIPE_SECRET_KEY', '') or '').strip()
    return stripe


def create_checkout_session(*, fine, success_url: str, cancel_url: str) -> dict:
    stripe = _stripe()
    amount_usd = Decimal(str(fine.amount))
    unit_amount = int(amount_usd * 100)
    if unit_amount < 50:
        unit_amount = 50

    session = stripe.checkout.Session.create(
        mode='payment',
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': getattr(settings, 'PAYMENT_CURRENCY', 'usd'),
                'unit_amount': unit_amount,
                'product_data': {
                    'name': f'CamTraffic fine {fine.id}',
                    'description': (fine.reason or 'Traffic violation fine')[:200],
                },
            },
            'quantity': 1,
        }],
        client_reference_id=str(fine.id),
        metadata={
            'fine_id': str(fine.id),
            'driver_id': str(fine.driver_id),
        },
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return {'session_id': session.id, 'checkout_url': session.url}


def verify_webhook(payload: bytes, sig_header: str) -> dict | None:
    secret = (getattr(settings, 'STRIPE_WEBHOOK_SECRET', '') or '').strip()
    if not secret:
        logger.warning('STRIPE_WEBHOOK_SECRET not configured')
        return None
    stripe = _stripe()
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except Exception:
        logger.exception('Stripe webhook verification failed')
        return None
    return event
