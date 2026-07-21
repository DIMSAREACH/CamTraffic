"""Payment mode discovery for driver fine checkout."""
from __future__ import annotations

from django.conf import settings

from .khqr_gateway import khqr_qr_image_url


def stripe_enabled() -> bool:
    key = (getattr(settings, 'STRIPE_SECRET_KEY', '') or '').strip()
    mode = (getattr(settings, 'PAYMENT_MODE', 'manual') or 'manual').lower()
    return bool(key) and mode in ('stripe', 'live', 'auto')


def khqr_enabled() -> bool:
    mode = (getattr(settings, 'PAYMENT_MODE', 'manual') or 'manual').lower()
    merchant = (getattr(settings, 'KHQR_MERCHANT_NAME', '') or '').strip()
    account_usd = (getattr(settings, 'KHQR_MERCHANT_ACCOUNT', '') or '').strip()
    account_khr = (getattr(settings, 'KHQR_MERCHANT_ACCOUNT_KHR', '') or '').strip()
    has_account = bool(account_usd or account_khr)
    return mode in ('khqr', 'aba_khqr', 'live', 'auto') and bool(merchant and has_account)


def manual_proof_enabled() -> bool:
    return getattr(settings, 'PAYMENT_MANUAL_PROOF_ENABLED', True)


def payment_config_payload() -> dict:
    modes: list[str] = []
    if stripe_enabled():
        modes.append('stripe')
    if khqr_enabled():
        modes.append('khqr')
    if manual_proof_enabled():
        modes.append('manual')
    payload = {
        'currency': getattr(settings, 'PAYMENT_CURRENCY', 'usd'),
        'modes': modes,
        'stripe_enabled': stripe_enabled(),
        'khqr_enabled': khqr_enabled(),
        'manual_enabled': manual_proof_enabled(),
        'demo_fallback': not stripe_enabled() and not khqr_enabled(),
    }
    if khqr_enabled():
        payload['khqr_qr_image_url'] = khqr_qr_image_url()
        payload['khqr_merchant_name'] = (getattr(settings, 'KHQR_MERCHANT_NAME', '') or '').strip()
    return payload
