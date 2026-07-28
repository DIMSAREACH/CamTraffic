"""
Management command to test all notification channels in production.
Validates configuration and sends test notifications to verify functionality.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
import json

from notifications.channel_dispatch import channel_status, send_email_to_user, dispatch_channels
from notifications.sms_service import SMSService
from notifications.push_service import PushNotificationService

User = get_user_model()


class Command(BaseCommand):
    help = 'Test notification channels and validate configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-test',
            action='store_true',
            help='Send actual test notifications (use with caution)',
        )
        parser.add_argument(
            '--test-email',
            type=str,
            help='Email address to send test notification to',
        )
        parser.add_argument(
            '--test-phone',
            type=str,
            help='Phone number to send test SMS to (+855XXXXXXXXX)',
        )
        parser.add_argument(
            '--test-user-id',
            type=str,
            help='User ID to send test push notification to',
        )
        parser.add_argument(
            '--channel',
            type=str,
            choices=['email', 'sms', 'push', 'all'],
            default='all',
            help='Specific channel to test (default: all)',
        )

    def handle(self, *args, **options):
        """Test notification channels based on options."""
        
        self.stdout.write('🔔 CamTraffic Notification System Test')
        self.stdout.write('=' * 45)
        
        # Check overall status
        self.check_notification_status()
        
        # Test specific channels
        if options['send_test']:
            self.run_notification_tests(options)
        else:
            self.stdout.write('\n💡 Add --send-test flag to send actual test notifications')

    def check_notification_status(self):
        """Check status of all notification channels."""
        
        self.stdout.write('\n📊 Notification Channel Status:')
        self.stdout.write('-' * 35)
        
        status = channel_status()
        
        # Email status
        if status['email']:
            self.stdout.write('✅ Email: Configured')
            self._check_email_details()
        else:
            self.stdout.write('❌ Email: Not configured')
            self._show_email_config_help()
        
        # SMS status  
        if status['sms']:
            self.stdout.write('✅ SMS: Configured')
            self._check_sms_details()
        else:
            self.stdout.write('❌ SMS: Not configured')
            self._show_sms_config_help()
        
        # Push notification status
        if status['push']:
            self.stdout.write('✅ Push: Configured')
            self._check_push_details()
        else:
            self.stdout.write('❌ Push: Not configured')
            self._show_push_config_help()
        
        # In-app notifications (always available)
        self.stdout.write('✅ In-app: Always available')
        
        # Overall assessment
        configured_channels = sum(1 for k, v in status.items() if v and k != 'system')
        total_channels = len(status) - 1  # Exclude 'system'
        
        if configured_channels == total_channels:
            self.stdout.write(self.style.SUCCESS(f'\n🎉 All {total_channels} notification channels configured'))
        elif configured_channels >= 2:
            self.stdout.write(self.style.WARNING(f'\n⚡ {configured_channels}/{total_channels} channels configured (recommended: all)'))
        else:
            self.stdout.write(self.style.ERROR(f'\n🔧 Only {configured_channels}/{total_channels} channels configured'))

    def _check_email_details(self):
        """Check email configuration details."""
        try:
            from authentication.resend_email import resend_configured, get_resend_from_email
            
            if resend_configured():
                from_email = get_resend_from_email()
                self.stdout.write(f'   Provider: Resend')
                self.stdout.write(f'   From: {from_email}')
            else:
                # Check SMTP config
                host = getattr(settings, 'EMAIL_HOST', '')
                port = getattr(settings, 'EMAIL_PORT', 587)
                user = getattr(settings, 'EMAIL_HOST_USER', '')
                
                if host:
                    self.stdout.write(f'   Provider: SMTP')
                    self.stdout.write(f'   Host: {host}:{port}')
                    self.stdout.write(f'   User: {user}')
        except Exception as e:
            self.stdout.write(f'   Error checking details: {e}')

    def _check_sms_details(self):
        """Check SMS configuration details."""
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        from_number = getattr(settings, 'TWILIO_FROM_NUMBER', '') or getattr(settings, 'TWILIO_PHONE_NUMBER', '')
        
        self.stdout.write(f'   Provider: Twilio')
        self.stdout.write(f'   Account: {account_sid[:8]}...' if account_sid else '   Account: Not set')
        self.stdout.write(f'   From: {from_number}')

    def _check_push_details(self):
        """Check push notification configuration details."""
        fcm_key = getattr(settings, 'FCM_SERVER_KEY', '')
        vapid_public = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        
        channels = []
        if fcm_key:
            channels.append('FCM (Mobile)')
        if vapid_public:
            channels.append('Web Push')
        
        self.stdout.write(f'   Channels: {", ".join(channels)}')
        
        if fcm_key:
            project_id = getattr(settings, 'FCM_PROJECT_ID', 'Not set')
            self.stdout.write(f'   FCM Project: {project_id}')

    def _show_email_config_help(self):
        """Show email configuration help."""
        self.stdout.write('   💡 Configure email in .env.production:')
        self.stdout.write('      # Resend (recommended)')
        self.stdout.write('      RESEND_API_KEY=re_your_api_key')
        self.stdout.write('      RESEND_FROM_EMAIL=CamTraffic <noreply@yourdomain.com>')
        self.stdout.write('      # OR SMTP')
        self.stdout.write('      EMAIL_HOST=smtp.gmail.com')
        self.stdout.write('      EMAIL_HOST_USER=your_email@gmail.com')
        self.stdout.write('      EMAIL_HOST_PASSWORD=your_app_password')

    def _show_sms_config_help(self):
        """Show SMS configuration help."""
        self.stdout.write('   💡 Configure SMS in .env.production:')
        self.stdout.write('      TWILIO_ACCOUNT_SID=your_account_sid')
        self.stdout.write('      TWILIO_AUTH_TOKEN=your_auth_token')
        self.stdout.write('      TWILIO_FROM_NUMBER=+855XXXXXXXXX')

    def _show_push_config_help(self):
        """Show push notification configuration help."""
        self.stdout.write('   💡 Configure push notifications in .env.production:')
        self.stdout.write('      # FCM (Firebase)')
        self.stdout.write('      FCM_SERVER_KEY=your_fcm_server_key')
        self.stdout.write('      FCM_PROJECT_ID=your_firebase_project_id')
        self.stdout.write('      # Web Push (VAPID)')
        self.stdout.write('      VAPID_PUBLIC_KEY=your_vapid_public_key')
        self.stdout.write('      VAPID_PRIVATE_KEY=your_vapid_private_key')

    def run_notification_tests(self, options):
        """Run actual notification tests."""
        
        self.stdout.write('\n🧪 Running Notification Tests:')
        self.stdout.write('-' * 30)
        
        channel = options['channel']
        
        if channel in ('email', 'all') and options.get('test_email'):
            self.test_email_notification(options['test_email'])
        
        if channel in ('sms', 'all') and options.get('test_phone'):
            self.test_sms_notification(options['test_phone'])
        
        if channel in ('push', 'all') and options.get('test_user_id'):
            self.test_push_notification(options['test_user_id'])
        
        if channel == 'all' and not any([options.get('test_email'), options.get('test_phone'), options.get('test_user_id')]):
            self.stdout.write('❓ No test targets specified. Use:')
            self.stdout.write('   --test-email user@example.com')
            self.stdout.write('   --test-phone +855123456789')
            self.stdout.write('   --test-user-id 12345')

    def test_email_notification(self, email):
        """Test email notification."""
        self.stdout.write(f'📧 Testing email to {email}...')
        
        # Create a temporary user object for testing
        class TestUser:
            def __init__(self, email):
                self.email = email
                self.first_name = 'Test'
                self.last_name = 'User'
        
        test_user = TestUser(email)
        
        result = send_email_to_user(
            user=test_user,
            title='CamTraffic Notification Test',
            message='This is a test notification from the CamTraffic system. If you received this, email notifications are working correctly!'
        )
        
        if result['success']:
            provider = result.get('provider', 'unknown')
            self.stdout.write(self.style.SUCCESS(f'   ✅ Email sent successfully via {provider}'))
        else:
            error = result.get('error', 'Unknown error')
            self.stdout.write(self.style.ERROR(f'   ❌ Email failed: {error}'))

    def test_sms_notification(self, phone):
        """Test SMS notification."""
        self.stdout.write(f'📱 Testing SMS to {phone}...')
        
        sms_service = SMSService()
        
        result = sms_service.send_sms(
            to_number=phone,
            message='CamTraffic SMS test: Notification system is working correctly!',
            notification_type='test'
        )
        
        if result['success']:
            message_sid = result.get('message_sid', 'N/A')
            self.stdout.write(self.style.SUCCESS(f'   ✅ SMS sent successfully (SID: {message_sid})'))
        else:
            error = result.get('error', 'Unknown error')
            self.stdout.write(self.style.ERROR(f'   ❌ SMS failed: {error}'))

    def test_push_notification(self, user_id):
        """Test push notification."""
        self.stdout.write(f'📲 Testing push notification to user {user_id}...')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'   ❌ User {user_id} not found'))
            return
        
        push_service = PushNotificationService()
        
        result = push_service.send_to_user(
            user=user,
            title='CamTraffic Push Test',
            body='Push notification system is working correctly!',
            notification_type='test'
        )
        
        if result['success'] and result['total_sent'] > 0:
            sent_count = result['total_sent']
            self.stdout.write(self.style.SUCCESS(f'   ✅ Push sent to {sent_count} device(s)'))
        else:
            self.stdout.write(self.style.ERROR(f'   ❌ Push failed or no registered devices'))

    def test_full_dispatch(self, user_id):
        """Test full multi-channel dispatch."""
        self.stdout.write(f'🚀 Testing full dispatch to user {user_id}...')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'   ❌ User {user_id} not found'))
            return
        
        result = dispatch_channels(
            user=user,
            title='CamTraffic Full Test',
            message='Testing all notification channels simultaneously.',
            notification_type='test',
            channels=['system', 'email', 'push', 'sms']
        )
        
        self.stdout.write(f'   Results: {json.dumps(result, indent=2)}')