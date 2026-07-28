"""
ABA/KHQR payment session — static merchant QR + amount + bill reference.

SANDBOX vs PRODUCTION:
- Sandbox: Use ABA-provided test account (712832071) for development
- Production: Use your live merchant account from ABA Bank

See: ABA-SANDBOX-CREDENTIALS.md for setup details
"""
from __future__ import annotations

import hashlib
import uuid
from decimal import Decimal

from django.conf import settings


def _normalize_account(raw: str) -> str:
    """Extract digits from account number"""
    return ''.join(ch for ch in (raw or '') if ch.isdigit())


def is_sandbox() -> bool:
    """Check if running in sandbox/test environment"""
    env = getattr(settings, 'KHQR_ENVIRONMENT', 'production').lower()
    return env in ('sandbox', 'test', 'development', 'dev')


def khqr_qr_image_url() -> str:
    return (getattr(settings, 'KHQR_QR_IMAGE_URL', '') or '/payments/aba-khqr.png').strip()


def create_khqr_session(*, fine) -> dict:
    """
    Create ABA KHQR payment session for a fine.
    
    Generates:
    - Unique bill reference (CT-{fine_id}-{random})
    - QR code URL (static merchant QR)
    - Payment instructions
    - Merchant account details
    
    Environment:
    - Sandbox: Uses test account 712832071 (see ABA-SANDBOX-CREDENTIALS.md)
    - Production: Uses live merchant account from settings
    
    Args:
        fine: Fine object to generate payment for
    
    Returns:
        dict with merchant info, bill_reference, QR URL, instructions
    """
    sandbox = is_sandbox()
    
    # Get merchant details
    merchant = (getattr(settings, 'KHQR_MERCHANT_NAME', '') or 'CamTraffic').strip()
    
    # For sandbox, mobile can be used as account; for production, use separate USD/KHR accounts
    account_usd = _normalize_account(getattr(settings, 'KHQR_MERCHANT_ACCOUNT', '') or '')
    account_khr = _normalize_account(getattr(settings, 'KHQR_MERCHANT_ACCOUNT_KHR', '') or '')
    
    # Amount (convert KHR to USD for display if needed)
    amount = Decimal(str(fine.amount))
    
    # Generate unique bill reference
    bill_ref = f"CT-{str(fine.id).replace('-', '')[:12].upper()}-{uuid.uuid4().hex[:6].upper()}"
    
    # Security fingerprint
    fingerprint = hashlib.sha256(f'{fine.id}:{amount}:{bill_ref}'.encode()).hexdigest()[:16]
    
    # QR code image URL
    qr_url = khqr_qr_image_url()
    
    # Display account (prefer USD, fallback to KHR)
    acct_line = account_usd or account_khr
    
    # Instructions (multi-language ready)
    env_label = ' (SANDBOX)' if sandbox else ''
    instructions_en = (
        f'Scan the ABA KHQR below{env_label}. In ABA Mobile tap "+" and select "Scan QR". '
        f'Enter amount: {amount} USD'
        f'{f" to account {account_usd}" if account_usd else ""}'
        f'{f" (or KHR account {account_khr})" if account_khr else ""}. '
        f'Add payment reference: {bill_ref}. '
        f'Then return here and tap "Submit Payment".'
    )
    
    instructions_km = (
        f'ស្កេន ABA KHQR ខាងក្រោម{env_label}។ នៅក្នុង ABA Mobile ចុច "+" រួចជ្រើស "Scan QR"។ '
        f'បញ្ចូលចំនួនទឹកប្រាក់: {amount} USD'
        f'{f" ទៅគណនី {account_usd}" if account_usd else ""}'
        f'{f" (ឬគណនីរៀល {account_khr})" if account_khr else ""}។ '
        f'បញ្ចូលលេខយោងការទូទាត់: {bill_ref}។ '
        f'បន្ទាប់មកត្រឡប់មកទីនេះ ហើយចុច "Submit Payment"។'
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
        'instructions_km': instructions_km,
        'environment': 'sandbox' if sandbox else 'production',
        'is_test': sandbox,
    }
