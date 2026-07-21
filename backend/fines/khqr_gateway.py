"""ABA/KHQR payment session — static merchant QR + amount + bill reference."""
from __future__ import annotations

import hashlib
import uuid
from decimal import Decimal

from django.conf import settings


def _normalize_account(raw: str) -> str:
    return ''.join(ch for ch in (raw or '') if ch.isdigit())


def khqr_qr_image_url() -> str:
    return (getattr(settings, 'KHQR_QR_IMAGE_URL', '') or '/payments/aba-khqr.png').strip()


def create_khqr_session(*, fine) -> dict:
    """
    Static ABA KHQR (screenshot in /payments/aba-khqr.png): payer scans, enters fine amount,
    pays to USD/KHR account, then confirms with bill_reference in CamTraffic.
    """
    merchant = (getattr(settings, 'KHQR_MERCHANT_NAME', '') or 'CamTraffic').strip()
    account_usd = _normalize_account(getattr(settings, 'KHQR_MERCHANT_ACCOUNT', '') or '')
    account_khr = _normalize_account(getattr(settings, 'KHQR_MERCHANT_ACCOUNT_KHR', '') or '')
    amount = Decimal(str(fine.amount))
    bill_ref = f"CT-{str(fine.id).replace('-', '')[:12].upper()}-{uuid.uuid4().hex[:6].upper()}"
    fingerprint = hashlib.sha256(f'{fine.id}:{amount}:{bill_ref}'.encode()).hexdigest()[:16]
    qr_url = khqr_qr_image_url()

    acct_line = account_usd or account_khr
    instructions_en = (
        f'Scan the ABA KHQR below. In ABA Mobile tap + Enter amount and pay exactly {amount} USD'
        f'{f" to account {account_usd}" if account_usd else ""}'
        f'{f" (or KHR account {account_khr})" if account_khr else ""}. '
        f'Add note/reference {bill_ref} if available. Then tap Pay now here (screenshot optional).'
    )

    return {
        'merchant_name': merchant,
        'merchant_account': acct_line,
        'merchant_account_usd': account_usd,
        'merchant_account_khr': account_khr,
        'amount_usd': str(amount),
        'currency': getattr(settings, 'PAYMENT_CURRENCY', 'usd'),
        'bill_reference': bill_ref,
        'payment_reference': bill_ref,
        'fingerprint': fingerprint,
        'qr_image_url': qr_url,
        'instructions_en': instructions_en,
        'instructions_km': instructions_en,
    }
