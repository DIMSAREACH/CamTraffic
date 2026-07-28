"""
SMS Alert Service - Twilio Integration
Sends SMS notifications for critical events (fines, violations, payments)
"""
import logging
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


def sms_enabled() -> bool:
    """Check if SMS service is configured"""
    return all([
        getattr(settings, 'TWILIO_ACCOUNT_SID', None),
        getattr(settings, 'TWILIO_AUTH_TOKEN', None),
        getattr(settings, 'TWILIO_PHONE_NUMBER', None),
    ])


class SMSService:
    """SMS notification service using Twilio"""
    
    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        self.enabled = sms_enabled()
    
    def send_sms(
        self,
        to_number: str,
        message: str,
        user: Optional[User] = None,
        notification_type: str = 'system',
    ) -> dict:
        """
        Send SMS via Twilio
        
        Args:
            to_number: Phone number with country code (e.g., +855123456789)
            message: SMS message body (max 160 chars recommended)
            user: Optional user for logging
            notification_type: Type of notification
        
        Returns:
            dict with success status and message SID
        """
        if not self.enabled:
            logger.warning('SMS service not configured')
            return {
                'success': False,
                'error': 'SMS service not configured',
                'configured': False,
            }
        
        # Validate phone number
        if not to_number or not to_number.startswith('+'):
            return {
                'success': False,
                'error': 'Invalid phone number format. Must start with + and country code',
            }
        
        # Truncate message if too long (160 chars for single SMS)
        if len(message) > 160:
            message = message[:157] + '...'
        
        try:
            from twilio.rest import Client
            
            client = Client(self.account_sid, self.auth_token)
            
            twilio_message = client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number,
            )
            
            # Log the SMS
            if user:
                self._log_sms(
                    user=user,
                    phone_number=to_number,
                    message=message,
                    notification_type=notification_type,
                    provider_message_sid=twilio_message.sid,
                    status='sent',
                )
            
            return {
                'success': True,
                'message_sid': twilio_message.sid,
                'status': twilio_message.status,
                'to': to_number,
            }
            
        except ImportError:
            logger.error('Twilio library not installed. Install with: pip install twilio')
            return {
                'success': False,
                'error': 'Twilio library not installed',
            }
        except Exception as e:
            logger.exception(f'Failed to send SMS to {to_number}')
            
            # Log failure
            if user:
                self._log_sms(
                    user=user,
                    phone_number=to_number,
                    message=message,
                    notification_type=notification_type,
                    status='failed',
                    error_message=str(e),
                )
            
            return {
                'success': False,
                'error': str(e),
            }
    
    def send_to_user(
        self,
        user: User,
        message: str,
        notification_type: str = 'system',
    ) -> dict:
        """
        Send SMS to user's registered phone number
        
        Args:
            user: User to send to
            message: SMS message body
            notification_type: Type of notification
        
        Returns:
            dict with success status
        """
        if not user.phone:
            return {
                'success': False,
                'error': 'User has no phone number registered',
            }
        
        return self.send_sms(
            to_number=user.phone,
            message=message,
            user=user,
            notification_type=notification_type,
        )
    
    def _log_sms(
        self,
        user: User,
        phone_number: str,
        message: str,
        notification_type: str,
        provider_message_sid: str = '',
        status: str = 'pending',
        error_message: str = '',
    ):
        """Log SMS to database for audit trail"""
        try:
            from notifications.models import SMSLog
            
            SMSLog.objects.create(
                user=user,
                phone_number=phone_number,
                message=message,
                notification_type=notification_type,
                provider='twilio',
                provider_message_sid=provider_message_sid,
                status=status,
                error_message=error_message,
            )
        except Exception as e:
            logger.warning(f'Failed to log SMS: {e}')


# Convenience functions
def send_sms_notification(user: User, message: str, notification_type: str = 'system') -> dict:
    """Send SMS to user"""
    service = SMSService()
    return service.send_to_user(user, message, notification_type)


def notify_fine_sms(user: User, fine) -> dict:
    """Send SMS alert for new fine"""
    message = (
        f"CamTraffic: New fine issued. Amount: ${fine.amount} USD. "
        f"Reason: {fine.reason[:80]}. "
        f"Pay at: {settings.FRONTEND_URL}/citizen/fines"
    )
    return send_sms_notification(user, message, notification_type='fine')


def notify_violation_sms(user: User, violation) -> dict:
    """Send SMS alert for new violation"""
    message = (
        f"CamTraffic: Traffic violation detected. "
        f"Type: {violation.violation_type}. "
        f"Location: {violation.location[:60]}. "
        f"View: {settings.FRONTEND_URL}/citizen/violations"
    )
    return send_sms_notification(user, message, notification_type='violation')


def notify_payment_confirmed_sms(user: User, fine) -> dict:
    """Send SMS confirmation for payment"""
    message = (
        f"CamTraffic: Payment confirmed. "
        f"Amount: ${fine.amount} USD. "
        f"Fine ID: {str(fine.id)[:8]}. "
        f"Thank you for your prompt payment."
    )
    return send_sms_notification(user, message, notification_type='payment')


def notify_payment_overdue_sms(user: User, fine) -> dict:
    """Send SMS reminder for overdue fine"""
    message = (
        f"CamTraffic: REMINDER - Fine overdue. "
        f"Amount: ${fine.amount} USD. "
        f"Please pay to avoid additional penalties. "
        f"Pay at: {settings.FRONTEND_URL}/citizen/fines"
    )
    return send_sms_notification(user, message, notification_type='fine')


def notify_appeal_decided_sms(user: User, appeal) -> dict:
    """Send SMS notification for appeal decision"""
    status = 'approved' if appeal.status == 'dismissed' else 'rejected'
    message = (
        f"CamTraffic: Your appeal has been {status}. "
        f"View details: {settings.FRONTEND_URL}/citizen/appeals"
    )
    return send_sms_notification(user, message, notification_type='appeal')


def get_sms_status(message_sid: str) -> dict:
    """
    Check delivery status of an SMS message
    
    Args:
        message_sid: Twilio message SID
    
    Returns:
        dict with status info
    """
    if not sms_enabled():
        return {'error': 'SMS service not configured'}
    
    try:
        from twilio.rest import Client
        
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID')
        auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN')
        
        client = Client(account_sid, auth_token)
        message = client.messages(message_sid).fetch()
        
        return {
            'status': message.status,
            'to': message.to,
            'from': message.from_,
            'body': message.body,
            'date_created': message.date_created,
            'date_sent': message.date_sent,
            'date_updated': message.date_updated,
            'error_code': message.error_code,
            'error_message': message.error_message,
        }
        
    except Exception as e:
        logger.exception(f'Failed to fetch SMS status for {message_sid}')
        return {'error': str(e)}


def update_sms_delivery_status(message_sid: str):
    """
    Update SMS log with delivery status from Twilio webhook
    Should be called from Twilio status callback endpoint
    """
    try:
        from notifications.models import SMSLog
        from django.utils import timezone
        
        status_info = get_sms_status(message_sid)
        
        if 'error' not in status_info:
            sms_log = SMSLog.objects.filter(provider_message_sid=message_sid).first()
            
            if sms_log:
                sms_log.status = status_info['status']
                
                if status_info['status'] == 'delivered':
                    sms_log.delivered_at = timezone.now()
                
                if status_info.get('error_message'):
                    sms_log.error_message = status_info['error_message']
                
                sms_log.save()
                
                logger.info(f'Updated SMS status for {message_sid}: {status_info["status"]}')
        
    except Exception as e:
        logger.exception(f'Failed to update SMS status for {message_sid}')
