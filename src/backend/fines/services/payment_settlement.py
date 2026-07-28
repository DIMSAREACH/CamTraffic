"""
Production payment settlement service with automated reconciliation.
Handles PSP webhooks, payment verification, and automated settlement processing.
"""

import logging
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import hashlib
import hmac

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache

from fines.models import Fine

logger = logging.getLogger(__name__)


class PaymentSettlementService:
    """Automated payment settlement and reconciliation service."""
    
    def __init__(self):
        self.stripe_enabled = self._is_stripe_enabled()
        self.khqr_enabled = self._is_khqr_enabled()
        self.aba_payway_enabled = self._is_aba_payway_enabled()
        
    def _is_stripe_enabled(self) -> bool:
        """Check if Stripe is properly configured."""
        key = getattr(settings, 'STRIPE_SECRET_KEY', '').strip()
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '').strip()
        mode = getattr(settings, 'PAYMENT_MODE', 'manual').lower()
        return bool(key and webhook_secret and mode in ('stripe', 'live', 'auto'))
    
    def _is_khqr_enabled(self) -> bool:
        """Check if KHQR is properly configured."""
        merchant = getattr(settings, 'KHQR_MERCHANT_NAME', '').strip()
        account = getattr(settings, 'KHQR_MERCHANT_ACCOUNT', '').strip()
        mode = getattr(settings, 'PAYMENT_MODE', 'manual').lower()
        return bool(merchant and account and mode in ('khqr', 'aba_khqr', 'live', 'auto'))
    
    def _is_aba_payway_enabled(self) -> bool:
        """Check if ABA PayWay API is configured for automated settlement."""
        api_key = getattr(settings, 'ABA_PAYWAY_API_KEY', '').strip()
        merchant_id = getattr(settings, 'ABA_PAYWAY_MERCHANT_ID', '').strip()
        return bool(api_key and merchant_id)
    
    def process_stripe_webhook(self, payload: bytes, signature: str) -> Dict[str, any]:
        """Process Stripe webhook for automated payment settlement."""
        try:
            # Import Stripe here to avoid dependency issues
            from fines import stripe_gateway
            
            # Verify webhook signature
            event = stripe_gateway.verify_webhook(payload, signature)
            if not event:
                return {'success': False, 'error': 'Invalid webhook signature'}
            
            event_type = event.get('type')
            data = event.get('data', {}).get('object', {})
            
            logger.info(f"Processing Stripe webhook: {event_type}")
            
            if event_type == 'checkout.session.completed':
                return self._handle_stripe_payment_completed(data)
            elif event_type == 'payment_intent.succeeded':
                return self._handle_stripe_payment_succeeded(data)
            elif event_type == 'charge.dispute.created':
                return self._handle_stripe_dispute_created(data)
            elif event_type == 'invoice.payment_failed':
                return self._handle_stripe_payment_failed(data)
            else:
                logger.info(f"Unhandled Stripe webhook event: {event_type}")
                return {'success': True, 'message': 'Event ignored'}
                
        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    def _handle_stripe_payment_completed(self, session_data: Dict) -> Dict[str, any]:
        """Handle successful Stripe payment completion."""
        try:
            fine_id = session_data.get('client_reference_id')
            payment_intent = session_data.get('payment_intent')
            amount_total = session_data.get('amount_total', 0) / 100  # Convert cents to dollars
            
            if not fine_id:
                return {'success': False, 'error': 'No fine ID in session'}
            
            with transaction.atomic():
                fine = Fine.objects.select_for_update().get(id=fine_id)
                
                if fine.status == 'paid':
                    return {'success': True, 'message': 'Fine already marked as paid'}
                
                # Update fine status
                fine.status = 'paid'
                fine.payment_method = 'stripe'
                fine.payment_reference = payment_intent or session_data.get('id', '')
                fine.paid_at = timezone.now()
                fine.payment_verified_at = timezone.now()
                fine.payment_verified_by = None  # Automated
                fine.save()
                
                # Log settlement
                self._log_payment_settlement(
                    fine=fine,
                    settlement_type='stripe_webhook',
                    amount=Decimal(str(amount_total)),
                    reference=payment_intent,
                    metadata={'session_id': session_data.get('id')}
                )
                
                logger.info(f"Stripe payment auto-settled: Fine {fine_id}, Amount: ${amount_total}")
                
                return {
                    'success': True,
                    'fine_id': fine_id,
                    'amount': amount_total,
                    'message': 'Payment automatically settled'
                }
                
        except Fine.DoesNotExist:
            logger.error(f"Fine not found for Stripe payment: {fine_id}")
            return {'success': False, 'error': 'Fine not found'}
        except Exception as e:
            logger.error(f"Error handling Stripe payment: {e}")
            return {'success': False, 'error': str(e)}
    
    def _handle_stripe_payment_succeeded(self, payment_intent_data: Dict) -> Dict[str, any]:
        """Handle Stripe PaymentIntent succeeded event."""
        # This is typically handled by checkout.session.completed
        # but we include it for completeness
        return {'success': True, 'message': 'PaymentIntent handled by checkout completion'}
    
    def _handle_stripe_dispute_created(self, dispute_data: Dict) -> Dict[str, any]:
        """Handle Stripe dispute/chargeback."""
        try:
            charge_id = dispute_data.get('charge')
            amount = dispute_data.get('amount', 0) / 100
            reason = dispute_data.get('reason', 'unknown')
            
            # Find fine by payment reference (charge ID)
            fine = Fine.objects.filter(
                payment_reference__icontains=charge_id,
                payment_method='stripe'
            ).first()
            
            if fine:
                # Mark fine as disputed
                fine.status = 'disputed'
                fine.save()
                
                logger.warning(f"Stripe dispute created: Fine {fine.id}, Amount: ${amount}, Reason: {reason}")
                
                # TODO: Send notification to admin about dispute
                
                return {
                    'success': True,
                    'fine_id': str(fine.id),
                    'dispute_amount': amount,
                    'dispute_reason': reason
                }
            
            return {'success': True, 'message': 'Dispute logged but no matching fine found'}
            
        except Exception as e:
            logger.error(f"Error handling Stripe dispute: {e}")
            return {'success': False, 'error': str(e)}
    
    def _handle_stripe_payment_failed(self, invoice_data: Dict) -> Dict[str, any]:
        """Handle failed Stripe payment."""
        # Log failed payment attempt
        logger.warning(f"Stripe payment failed: {invoice_data.get('id')}")
        return {'success': True, 'message': 'Payment failure logged'}
    
    def process_aba_payway_webhook(self, payload: Dict, signature: str) -> Dict[str, any]:
        """Process ABA PayWay webhook for automated KHQR settlement."""
        try:
            # Verify webhook signature
            if not self._verify_aba_signature(payload, signature):
                return {'success': False, 'error': 'Invalid ABA webhook signature'}
            
            transaction_type = payload.get('transaction_type')
            transaction_id = payload.get('transaction_id')
            amount = Decimal(str(payload.get('amount', 0)))
            reference = payload.get('reference', '')
            status = payload.get('status', '')
            
            logger.info(f"Processing ABA PayWay webhook: {transaction_type}, Ref: {reference}")
            
            if transaction_type == 'payment' and status == 'completed':
                return self._handle_aba_payment_completed(
                    transaction_id=transaction_id,
                    amount=amount,
                    reference=reference,
                    metadata=payload
                )
            elif status == 'failed':
                return self._handle_aba_payment_failed(transaction_id, reference)
            else:
                return {'success': True, 'message': 'ABA event ignored'}
                
        except Exception as e:
            logger.error(f"Error processing ABA PayWay webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    def _handle_aba_payment_completed(self, transaction_id: str, amount: Decimal, 
                                      reference: str, metadata: Dict) -> Dict[str, any]:
        """Handle successful ABA KHQR payment."""
        try:
            # Find fine by payment reference (bill reference)
            fine = Fine.objects.filter(
                payment_reference__icontains=reference.replace('CT-', ''),
                status='awaiting_verification'
            ).first()
            
            if not fine:
                logger.warning(f"No pending fine found for ABA payment reference: {reference}")
                return {'success': False, 'error': 'Fine not found'}
            
            # Verify amount matches
            if abs(float(fine.amount) - float(amount)) > 0.01:
                logger.warning(f"Amount mismatch: Fine {fine.amount}, ABA {amount}")
                return {'success': False, 'error': 'Amount mismatch'}
            
            with transaction.atomic():
                fine.status = 'paid'
                fine.payment_method = 'khqr'
                fine.payment_reference = reference
                fine.paid_at = timezone.now()
                fine.payment_verified_at = timezone.now()
                fine.payment_verified_by = None  # Automated
                fine.save()
                
                # Log settlement
                self._log_payment_settlement(
                    fine=fine,
                    settlement_type='aba_payway_webhook',
                    amount=amount,
                    reference=transaction_id,
                    metadata=metadata
                )
                
                logger.info(f"ABA KHQR payment auto-settled: Fine {fine.id}, Amount: ${amount}")
                
                return {
                    'success': True,
                    'fine_id': str(fine.id),
                    'amount': float(amount),
                    'transaction_id': transaction_id,
                    'message': 'KHQR payment automatically settled'
                }
                
        except Exception as e:
            logger.error(f"Error handling ABA payment completion: {e}")
            return {'success': False, 'error': str(e)}
    
    def _handle_aba_payment_failed(self, transaction_id: str, reference: str) -> Dict[str, any]:
        """Handle failed ABA payment."""
        logger.warning(f"ABA payment failed: {transaction_id}, Ref: {reference}")
        # Could update fine status or send notification
        return {'success': True, 'message': 'ABA payment failure logged'}
    
    def _verify_aba_signature(self, payload: Dict, signature: str) -> bool:
        """Verify ABA PayWay webhook signature."""
        webhook_secret = getattr(settings, 'ABA_PAYWAY_WEBHOOK_SECRET', '').strip()
        if not webhook_secret:
            logger.warning('ABA_PAYWAY_WEBHOOK_SECRET not configured')
            return False
        
        # Create signature from payload
        payload_string = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        expected_signature = hmac.new(
            webhook_secret.encode(),
            payload_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    def _log_payment_settlement(self, fine, settlement_type: str, amount: Decimal, 
                                reference: str, metadata: Dict = None):
        """Log payment settlement for audit trail."""
        settlement_log = {
            'fine_id': str(fine.id),
            'settlement_type': settlement_type,
            'amount': float(amount),
            'payment_reference': reference,
            'settled_at': timezone.now().isoformat(),
            'metadata': metadata or {}
        }
        
        # Cache settlement log for reporting
        cache_key = f"settlement_log_{timezone.now().strftime('%Y%m%d')}"
        existing_logs = cache.get(cache_key, [])
        existing_logs.append(settlement_log)
        cache.set(cache_key, existing_logs, 86400)  # 24 hours
        
        logger.info(f"Payment settlement logged: {settlement_type} for fine {fine.id}")
    
    def reconcile_payments(self, date_from: datetime, date_to: datetime) -> Dict[str, any]:
        """Reconcile payments for a date range."""
        try:
            # Get all paid fines in date range
            paid_fines = Fine.objects.filter(
                paid_at__gte=date_from,
                paid_at__lte=date_to,
                status='paid'
            ).values(
                'id', 'amount', 'payment_method', 'payment_reference', 
                'paid_at', 'payment_verified_at'
            )
            
            reconciliation = {
                'date_range': {
                    'from': date_from.isoformat(),
                    'to': date_to.isoformat()
                },
                'summary': {
                    'total_payments': len(paid_fines),
                    'total_amount': sum(Decimal(str(f['amount'])) for f in paid_fines),
                    'by_method': {}
                },
                'automated_settlements': 0,
                'manual_verifications': 0,
                'discrepancies': []
            }
            
            # Group by payment method
            for fine in paid_fines:
                method = fine['payment_method'] or 'unknown'
                if method not in reconciliation['summary']['by_method']:
                    reconciliation['summary']['by_method'][method] = {
                        'count': 0,
                        'amount': Decimal('0')
                    }
                
                reconciliation['summary']['by_method'][method]['count'] += 1
                reconciliation['summary']['by_method'][method]['amount'] += Decimal(str(fine['amount']))
                
                # Check if automated or manual
                if fine['payment_verified_at'] and fine['payment_verified_at'] == fine['paid_at']:
                    reconciliation['automated_settlements'] += 1
                else:
                    reconciliation['manual_verifications'] += 1
            
            # Convert Decimal to float for JSON serialization
            for method_data in reconciliation['summary']['by_method'].values():
                method_data['amount'] = float(method_data['amount'])
            
            reconciliation['summary']['total_amount'] = float(reconciliation['summary']['total_amount'])
            
            logger.info(f"Payment reconciliation completed for {date_from.date()} to {date_to.date()}")
            
            return reconciliation
            
        except Exception as e:
            logger.error(f"Error during payment reconciliation: {e}")
            return {'error': str(e)}
    
    def get_settlement_status(self) -> Dict[str, any]:
        """Get current settlement system status."""
        return {
            'payment_methods': {
                'stripe': {
                    'enabled': self.stripe_enabled,
                    'automated_settlement': self.stripe_enabled,
                    'webhook_configured': bool(getattr(settings, 'STRIPE_WEBHOOK_SECRET', '').strip())
                },
                'khqr': {
                    'enabled': self.khqr_enabled,
                    'automated_settlement': self.aba_payway_enabled,
                    'webhook_configured': self.aba_payway_enabled
                },
                'manual': {
                    'enabled': getattr(settings, 'PAYMENT_MANUAL_PROOF_ENABLED', True),
                    'automated_settlement': False,
                    'requires_verification': True
                }
            },
            'settlement_features': {
                'automated_webhooks': self.stripe_enabled or self.aba_payway_enabled,
                'real_time_settlement': True,
                'reconciliation_reports': True,
                'dispute_handling': self.stripe_enabled
            },
            'configuration_status': {
                'production_ready': self.stripe_enabled or self.khqr_enabled,
                'demo_fallback': not (self.stripe_enabled or self.khqr_enabled)
            }
        }


# Singleton instance
payment_settlement = PaymentSettlementService()