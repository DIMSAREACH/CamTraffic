"""
Push Notification Service - Firebase Cloud Messaging (FCM) & Web Push
Supports: Mobile apps, Web browsers, Progressive Web Apps
"""
import json
import logging
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


def fcm_enabled() -> bool:
    """Check if FCM is configured"""
    return bool(getattr(settings, 'FCM_SERVER_KEY', None))


def web_push_enabled() -> bool:
    """Check if Web Push is configured"""
    return bool(getattr(settings, 'VAPID_PUBLIC_KEY', None) and 
                getattr(settings, 'VAPID_PRIVATE_KEY', None))


class PushNotificationService:
    """Unified push notification service for FCM and Web Push"""
    
    def __init__(self):
        self.fcm_server_key = getattr(settings, 'FCM_SERVER_KEY', None)
        self.vapid_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        self.vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        self.vapid_claims = {
            "sub": f"mailto:{getattr(settings, 'ADMIN_EMAIL', 'admin@camtraffic.gov.kh')}"
        }
    
    def send_to_user(
        self,
        user: User,
        title: str,
        body: str,
        data: Optional[dict] = None,
        notification_type: str = 'system',
        priority: str = 'high',
    ) -> dict:
        """
        Send push notification to user across all registered devices
        
        Returns:
            dict with success count and details
        """
        if not user:
            return {'success': False, 'error': 'User is required'}
        
        results = {
            'fcm': {'sent': 0, 'failed': 0},
            'web_push': {'sent': 0, 'failed': 0},
            'total_sent': 0,
            'success': False,
        }
        
        # Get user's registered devices
        devices = self._get_user_devices(user)
        
        # Send via FCM (mobile apps)
        if self.fcm_server_key and devices['fcm_tokens']:
            fcm_result = self._send_fcm(
                tokens=devices['fcm_tokens'],
                title=title,
                body=body,
                data=data or {},
                notification_type=notification_type,
                priority=priority,
            )
            results['fcm'] = fcm_result
            results['total_sent'] += fcm_result['sent']
        
        # Send via Web Push (browsers)
        if self.vapid_public_key and devices['web_push_subscriptions']:
            web_result = self._send_web_push(
                subscriptions=devices['web_push_subscriptions'],
                title=title,
                body=body,
                data=data or {},
                notification_type=notification_type,
            )
            results['web_push'] = web_result
            results['total_sent'] += web_result['sent']
        
        results['success'] = results['total_sent'] > 0
        return results
    
    def _get_user_devices(self, user: User) -> dict:
        """Get all registered devices for a user"""
        from notifications.models import PushDevice
        
        devices = PushDevice.objects.filter(user=user, is_active=True)
        
        return {
            'fcm_tokens': [d.fcm_token for d in devices if d.fcm_token],
            'web_push_subscriptions': [
                {
                    'endpoint': d.web_push_endpoint,
                    'keys': {
                        'p256dh': d.web_push_p256dh,
                        'auth': d.web_push_auth,
                    }
                }
                for d in devices if d.web_push_endpoint
            ],
        }
    
    def _send_fcm(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict,
        notification_type: str,
        priority: str,
    ) -> dict:
        """Send via Firebase Cloud Messaging"""
        try:
            import requests
            
            headers = {
                'Authorization': f'key={self.fcm_server_key}',
                'Content-Type': 'application/json',
            }
            
            # Priority mapping
            android_priority = 'high' if priority == 'high' else 'normal'
            apns_priority = '10' if priority == 'high' else '5'
            
            sent = 0
            failed = 0
            
            for token in tokens:
                payload = {
                    'to': token,
                    'priority': priority,
                    'notification': {
                        'title': title,
                        'body': body,
                        'icon': '/favicon.ico',
                        'badge': '/badge.png',
                        'sound': 'default',
                        'click_action': self._get_click_action(notification_type),
                    },
                    'data': {
                        **data,
                        'type': notification_type,
                        'timestamp': str(self._get_timestamp()),
                    },
                    'android': {
                        'priority': android_priority,
                        'notification': {
                            'sound': 'default',
                            'color': self._get_notification_color(notification_type),
                        },
                    },
                    'apns': {
                        'headers': {
                            'apns-priority': apns_priority,
                        },
                        'payload': {
                            'aps': {
                                'sound': 'default',
                                'badge': 1,
                            },
                        },
                    },
                    'webpush': {
                        'headers': {
                            'Urgency': priority,
                        },
                        'notification': {
                            'icon': '/favicon.ico',
                            'badge': '/badge.png',
                        },
                    },
                }
                
                response = requests.post(
                    'https://fcm.googleapis.com/fcm/send',
                    headers=headers,
                    json=payload,
                    timeout=10,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success', 0) > 0:
                        sent += 1
                    else:
                        failed += 1
                        if result.get('failure', 0) > 0:
                            # Token might be invalid, mark for cleanup
                            self._mark_token_invalid(token)
                else:
                    failed += 1
            
            return {'sent': sent, 'failed': failed, 'service': 'fcm'}
            
        except Exception as e:
            logger.exception('FCM push notification failed')
            return {'sent': 0, 'failed': len(tokens), 'error': str(e), 'service': 'fcm'}
    
    def _send_web_push(
        self,
        subscriptions: list[dict],
        title: str,
        body: str,
        data: dict,
        notification_type: str,
    ) -> dict:
        """Send via Web Push (browsers)"""
        try:
            from pywebpush import webpush, WebPushException
            
            sent = 0
            failed = 0
            
            for subscription in subscriptions:
                try:
                    payload = json.dumps({
                        'title': title,
                        'body': body,
                        'icon': '/favicon.ico',
                        'badge': '/badge.png',
                        'data': {
                            **data,
                            'type': notification_type,
                            'url': self._get_click_action(notification_type),
                        },
                        'tag': notification_type,
                        'requireInteraction': notification_type in ('fine', 'violation'),
                    })
                    
                    webpush(
                        subscription_info=subscription,
                        data=payload,
                        vapid_private_key=self.vapid_private_key,
                        vapid_claims=self.vapid_claims,
                    )
                    sent += 1
                    
                except WebPushException as e:
                    failed += 1
                    if e.response and e.response.status_code in (404, 410):
                        # Subscription expired, mark for cleanup
                        self._mark_subscription_invalid(subscription['endpoint'])
                    logger.warning(f'Web push failed: {e}')
            
            return {'sent': sent, 'failed': failed, 'service': 'web_push'}
            
        except ImportError:
            logger.warning('pywebpush not installed. Install with: pip install pywebpush')
            return {'sent': 0, 'failed': len(subscriptions), 'error': 'pywebpush not installed', 'service': 'web_push'}
        except Exception as e:
            logger.exception('Web push notification failed')
            return {'sent': 0, 'failed': len(subscriptions), 'error': str(e), 'service': 'web_push'}
    
    def _get_click_action(self, notification_type: str) -> str:
        """Get the URL to open when notification is clicked"""
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        actions = {
            'fine': f'{base_url}/citizen/fines',
            'violation': f'{base_url}/citizen/violations',
            'detection': f'{base_url}/citizen/violations',
            'appeal': f'{base_url}/citizen/appeals',
            'payment': f'{base_url}/citizen/fines/payments',
            'system': f'{base_url}/citizen',
        }
        
        return actions.get(notification_type, f'{base_url}/citizen/notifications')
    
    def _get_notification_color(self, notification_type: str) -> str:
        """Get notification color based on type"""
        colors = {
            'fine': '#F59E0B',      # Amber
            'violation': '#EF4444',  # Red
            'detection': '#3B82F6',  # Blue
            'appeal': '#8B5CF6',     # Purple
            'payment': '#10B981',    # Green
            'system': '#6366F1',     # Indigo
        }
        return colors.get(notification_type, '#3B82F6')
    
    def _get_timestamp(self):
        """Get current timestamp"""
        from django.utils import timezone
        return timezone.now()
    
    def _mark_token_invalid(self, token: str):
        """Mark FCM token as invalid for cleanup"""
        from notifications.models import PushDevice
        PushDevice.objects.filter(fcm_token=token).update(is_active=False)
    
    def _mark_subscription_invalid(self, endpoint: str):
        """Mark Web Push subscription as invalid for cleanup"""
        from notifications.models import PushDevice
        PushDevice.objects.filter(web_push_endpoint=endpoint).update(is_active=False)


# Convenience functions
def send_push_notification(user: User, title: str, body: str, **kwargs) -> dict:
    """
    Send push notification to user
    
    Args:
        user: User to send to
        title: Notification title
        body: Notification body
        data: Optional dict of custom data
        notification_type: Type (fine, violation, etc.)
        priority: 'high' or 'normal'
    
    Returns:
        dict with results
    """
    service = PushNotificationService()
    return service.send_to_user(user, title, body, **kwargs)


def notify_fine_push(user: User, fine) -> dict:
    """Send push notification for new fine"""
    return send_push_notification(
        user=user,
        title='🚨 New Fine Issued',
        body=f'You have received a fine of ${fine.amount} USD for: {fine.reason[:50]}',
        data={'fine_id': str(fine.id), 'amount': str(fine.amount)},
        notification_type='fine',
        priority='high',
    )


def notify_violation_push(user: User, violation) -> dict:
    """Send push notification for new violation"""
    return send_push_notification(
        user=user,
        title='⚠️ Traffic Violation Detected',
        body=f'{violation.violation_type} detected at {violation.location}',
        data={'violation_id': str(violation.id)},
        notification_type='violation',
        priority='high',
    )


def notify_payment_confirmed_push(user: User, fine) -> dict:
    """Send push notification for payment confirmation"""
    return send_push_notification(
        user=user,
        title='✅ Payment Confirmed',
        body=f'Your payment of ${fine.amount} USD has been confirmed',
        data={'fine_id': str(fine.id)},
        notification_type='payment',
        priority='normal',
    )


def notify_appeal_decided_push(user: User, appeal) -> dict:
    """Send push notification for appeal decision"""
    status = 'approved' if appeal.status == 'dismissed' else 'rejected'
    return send_push_notification(
        user=user,
        title=f'📋 Appeal {status.title()}',
        body=f'Your appeal has been {status}',
        data={'appeal_id': str(appeal.id)},
        notification_type='appeal',
        priority='normal',
    )
