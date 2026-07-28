"""
Production payment webhook endpoints for automated settlement.
Handles PSP callbacks for real-time payment processing.
"""

import json
import logging
from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.conf import settings
import hashlib
import hmac

from .services.payment_settlement import payment_settlement

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """
    Stripe webhook endpoint for automated payment settlement.
    
    Endpoint: POST /api/webhooks/payments/stripe/
    
    Handles:
    - checkout.session.completed (payment success)
    - payment_intent.succeeded (backup)
    - charge.dispute.created (chargebacks)
    - invoice.payment_failed (failures)
    """
    try:
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        
        if not sig_header:
            logger.warning("Stripe webhook missing signature header")
            return HttpResponseBadRequest("Missing signature")
        
        # Process webhook through settlement service
        result = payment_settlement.process_stripe_webhook(payload, sig_header)
        
        if result['success']:
            logger.info(f"Stripe webhook processed successfully: {result.get('message', '')}")
            return JsonResponse({
                'status': 'success',
                'message': result.get('message', 'Webhook processed'),
                'data': {
                    'fine_id': result.get('fine_id'),
                    'amount': result.get('amount')
                }
            })
        else:
            logger.error(f"Stripe webhook processing failed: {result.get('error', 'Unknown error')}")
            return HttpResponseBadRequest(result.get('error', 'Webhook processing failed'))
            
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return HttpResponseBadRequest(f"Webhook error: {str(e)}")


@csrf_exempt
@require_http_methods(["POST"])
def aba_payway_webhook(request):
    """
    ABA PayWay webhook endpoint for automated KHQR settlement.
    
    Endpoint: POST /api/webhooks/payments/aba-payway/
    
    Handles:
    - payment.completed (KHQR payment success)
    - payment.failed (payment failures)
    - transaction.disputed (disputes)
    """
    try:
        # Get signature from header
        signature = request.META.get('HTTP_X_ABA_SIGNATURE', '')
        if not signature:
            logger.warning("ABA PayWay webhook missing signature")
            return HttpResponseBadRequest("Missing signature")
        
        # Parse JSON payload
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            logger.warning("ABA PayWay webhook invalid JSON")
            return HttpResponseBadRequest("Invalid JSON payload")
        
        # Process webhook through settlement service
        result = payment_settlement.process_aba_payway_webhook(payload, signature)
        
        if result['success']:
            logger.info(f"ABA PayWay webhook processed: {result.get('message', '')}")
            return JsonResponse({
                'status': 'success',
                'message': result.get('message', 'Webhook processed'),
                'transaction_id': result.get('transaction_id'),
                'fine_id': result.get('fine_id')
            })
        else:
            logger.error(f"ABA PayWay webhook failed: {result.get('error', 'Unknown error')}")
            return HttpResponseBadRequest(result.get('error', 'Webhook processing failed'))
            
    except Exception as e:
        logger.error(f"ABA PayWay webhook error: {e}")
        return HttpResponseBadRequest(f"Webhook error: {str(e)}")


@csrf_exempt 
@require_http_methods(["POST"])
def generic_payment_webhook(request):
    """
    Generic payment webhook for other PSPs.
    
    Endpoint: POST /api/webhooks/payments/generic/
    
    Can be extended to support additional payment service providers.
    """
    try:
        # Get PSP identifier from header or payload
        psp_type = request.META.get('HTTP_X_PSP_TYPE', 'unknown')
        
        logger.info(f"Generic payment webhook received from PSP: {psp_type}")
        
        # For now, just log and return success
        # This can be extended to route to specific PSP handlers
        
        payload = json.loads(request.body.decode('utf-8'))
        
        return JsonResponse({
            'status': 'received',
            'message': f'Webhook from {psp_type} logged successfully',
            'psp_type': psp_type
        })
        
    except Exception as e:
        logger.error(f"Generic payment webhook error: {e}")
        return HttpResponseBadRequest(f"Webhook error: {str(e)}")


@require_http_methods(["GET", "POST"])
def payment_settlement_status(request):
    """
    Payment settlement system status endpoint.
    
    Endpoint: GET/POST /api/webhooks/payments/status/
    
    Returns current settlement system configuration and health.
    """
    try:
        status = payment_settlement.get_settlement_status()
        
        return JsonResponse({
            'status': 'operational',
            'timestamp': request.META.get('HTTP_DATE', ''),
            'settlement_system': status
        })
        
    except Exception as e:
        logger.error(f"Settlement status error: {e}")
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def test_webhook(request):
    """
    Test webhook endpoint for development and integration testing.
    
    Endpoint: POST /api/webhooks/payments/test/
    
    Only available in development or when explicitly enabled.
    """
    if not settings.DEBUG and not getattr(settings, 'ENABLE_TEST_WEBHOOKS', False):
        return HttpResponseBadRequest("Test webhooks disabled in production")
    
    try:
        payload = json.loads(request.body.decode('utf-8'))
        webhook_type = payload.get('type', 'test')
        
        logger.info(f"Test webhook received: {webhook_type}")
        
        # Simulate webhook processing
        if webhook_type == 'stripe_test':
            return JsonResponse({
                'status': 'test_success',
                'message': 'Stripe test webhook processed',
                'payload': payload
            })
        elif webhook_type == 'aba_test':
            return JsonResponse({
                'status': 'test_success', 
                'message': 'ABA PayWay test webhook processed',
                'payload': payload
            })
        else:
            return JsonResponse({
                'status': 'test_received',
                'message': f'Test webhook type {webhook_type} received',
                'payload': payload
            })
            
    except Exception as e:
        logger.error(f"Test webhook error: {e}")
        return HttpResponseBadRequest(f"Test webhook error: {str(e)}")


# Security helper for webhook URL validation
def validate_webhook_source(request, allowed_ips=None):
    """
    Validate webhook source IP for additional security.
    
    Args:
        request: Django request object
        allowed_ips: List of allowed source IPs (optional)
    
    Returns:
        bool: True if source is valid
    """
    if not allowed_ips:
        # Default allowed IPs for common PSPs
        allowed_ips = [
            # Stripe webhook IPs (example - check Stripe docs for current list)
            '54.187.174.169',
            '54.187.205.235', 
            '54.187.216.72',
            # ABA Bank webhook IPs (example - get from ABA)
            '203.144.207.0',  # Cambodia IP range example
            # Local development
            '127.0.0.1',
            '::1'
        ]
    
    # Get client IP (handling proxies)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(',')[0].strip()
    else:
        client_ip = request.META.get('REMOTE_ADDR', '')
    
    # In development, allow all IPs
    if settings.DEBUG:
        return True
    
    return client_ip in allowed_ips