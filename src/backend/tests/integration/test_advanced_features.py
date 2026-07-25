"""
Comprehensive Integration Tests for Advanced Driver Portal Features

Tests all 6 advanced features:
1. Push Notifications (FCM/Web Push)
2. SMS Alerts
3. PDF Receipt Generation
4. Map View
5. Payment Installments
6. Violation Heatmap
"""
import io
from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from fines.installments import InstallmentService
from fines.models import Fine
from fines.pdf_receipt import generate_fine_receipt_pdf
from notifications.models import Notification, PushDevice, SMSLog
from notifications.push_service import PushNotificationService
from notifications.sms_service import SMSService
from violations.models import TrafficViolation as Violation

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing"""
    return APIClient()


@pytest.fixture
def driver_user(db):
    """Create a test driver user"""
    user = User.objects.create_user(
        email='driver_advanced@test.com',
        password='testpass123',
        full_name='Test Driver Advanced',
        role='driver',
        phone='+85512345678',
        license_no='TEST-123',
    )
    return user


@pytest.fixture
def fine_for_testing(db, driver_user):
    """Create a test fine"""
    fine = Fine.objects.create(
        driver=driver_user,
        reason='Speeding 80 km/h in 50 km/h zone',
        amount=Decimal('50.00'),
        location='Street 51, Phnom Penh',
        vehicle_plate='2A-1234',
        status='pending',
    )
    return fine


@pytest.fixture
def violation_for_testing(db, driver_user):
    """Create a test violation"""
    from cameras.models import Camera
    from roads.models import Road
    
    road, _ = Road.objects.get_or_create(
        name='Street 51',
        defaults={'province': 'Phnom Penh'}
    )
    
    camera, _ = Camera.objects.get_or_create(
        name='CAM-TEST-001',
        defaults={
            'location': 'Street 51, Phnom Penh',
            'gps_latitude': 11.556374,
            'gps_longitude': 104.928207,
            'status': 'active',
        }
    )
    
    violation = Violation.objects.create(
        driver=driver_user,
        camera=camera,
        road=road,
        violation_type='speeding',
        detected_sign_code='B5',
        observed_action='speeding_moderate',
        location='Street 51, Phnom Penh',
        violation_date=timezone.now(),
        status='confirmed',
        ai_confidence_score=Decimal('0.92'),
    )
    return violation


# ============================================================================
# Test 1: Push Notifications
# ============================================================================

@pytest.mark.django_db
class TestPushNotifications:
    """Test push notification system"""
    
    def test_register_fcm_device(self, api_client, driver_user):
        """Test registering FCM device"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.post('/api/notifications/push/register/', {
            'platform': 'android',
            'device_name': 'Samsung Galaxy S21',
            'fcm_token': 'test_fcm_token_123456',
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True
        assert 'device_id' in response.data
        
        # Verify device was created
        device = PushDevice.objects.get(user=driver_user, fcm_token='test_fcm_token_123456')
        assert device.platform == 'android'
        assert device.is_active is True
    
    def test_register_web_push_device(self, api_client, driver_user):
        """Test registering Web Push device"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.post('/api/notifications/push/register/', {
            'platform': 'web',
            'device_name': 'Chrome on Windows',
            'web_push_endpoint': 'https://fcm.googleapis.com/fcm/send/test',
            'web_push_p256dh': 'test_p256dh_key',
            'web_push_auth': 'test_auth_secret',
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify device was created
        device = PushDevice.objects.get(user=driver_user, platform='web')
        assert device.web_push_endpoint is not None
    
    def test_list_push_devices(self, api_client, driver_user):
        """Test listing registered devices"""
        # Create test devices
        PushDevice.objects.create(
            user=driver_user,
            platform='android',
            device_name='Test Phone',
            fcm_token='test_token',
            is_active=True,
        )
        
        api_client.force_authenticate(user=driver_user)
        response = api_client.get('/api/notifications/push/devices/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total'] == 1
        assert len(response.data['devices']) == 1
    
    @patch('notifications.push_service.requests.post')
    @override_settings(FCM_SERVER_KEY='test_key')
    def test_send_push_notification(self, mock_post, driver_user):
        """Test sending push notification"""
        # Mock FCM response
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {'success': 1, 'failure': 0}
        )
        
        # Create device
        PushDevice.objects.create(
            user=driver_user,
            platform='android',
            fcm_token='test_token',
            is_active=True,
        )
        
        # Send notification
        service = PushNotificationService()
        result = service.send_to_user(
            user=driver_user,
            title='Test Notification',
            body='Test body',
            notification_type='system',
        )
        
        assert result['success'] is True
        assert result['total_sent'] > 0


# ============================================================================
# Test 2: SMS Alerts
# ============================================================================

@pytest.mark.django_db
class TestSMSAlerts:
    """Test SMS alert system"""
    
    @patch('notifications.sms_service.Client')
    @override_settings(
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_PHONE_NUMBER='+1234567890'
    )
    def test_send_sms_to_user(self, mock_client_class, driver_user):
        """Test sending SMS to user"""
        # Mock Twilio client
        mock_message = Mock()
        mock_message.sid = 'SM123456'
        mock_message.status = 'sent'
        
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_message
        mock_client_class.return_value = mock_client
        
        # Send SMS
        service = SMSService()
        result = service.send_to_user(
            user=driver_user,
            message='Test SMS message',
            notification_type='system',
        )
        
        assert result['success'] is True
        assert 'message_sid' in result
        
        # Verify SMS was logged
        sms_log = SMSLog.objects.get(user=driver_user)
        assert sms_log.status == 'sent'
        assert sms_log.phone_number == driver_user.phone
    
    @patch('notifications.sms_service.Client')
    @override_settings(
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_PHONE_NUMBER='+1234567890'
    )
    def test_sms_fine_notification(self, mock_client_class, driver_user, fine_for_testing):
        """Test SMS notification for new fine"""
        from notifications.sms_service import notify_fine_sms
        
        # Mock Twilio
        mock_message = Mock(sid='SM123', status='sent')
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_message
        mock_client_class.return_value = mock_client
        
        # Send notification
        result = notify_fine_sms(user=driver_user, fine=fine_for_testing)
        
        assert result['success'] is True


# ============================================================================
# Test 3: PDF Receipt Generation
# ============================================================================

@pytest.mark.django_db
class TestPDFReceipts:
    """Test PDF receipt generation"""
    
    def test_generate_pdf_receipt(self, fine_for_testing):
        """Test generating PDF receipt"""
        pdf_bytes = generate_fine_receipt_pdf(fine_for_testing)
        
        assert pdf_bytes is not None
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000  # PDF should be substantial
        assert pdf_bytes[:4] == b'%PDF'  # PDF magic number
    
    def test_download_pdf_receipt_api(self, api_client, driver_user, fine_for_testing):
        """Test downloading PDF receipt via API"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.get(f'/api/fines/{fine_for_testing.id}/receipt/pdf/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'
        assert 'attachment' in response['Content-Disposition']
    
    def test_pdf_with_evidence(self, fine_for_testing):
        """Test PDF generation with evidence images"""
        pdf_bytes = generate_fine_receipt_pdf(
            fine_for_testing,
            include_evidence=True
        )
        
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 1000


# ============================================================================
# Test 4: Real-time Map View
# ============================================================================

@pytest.mark.django_db
class TestViolationMap:
    """Test violation map view"""
    
    def test_get_violation_map_data(self, api_client, driver_user, violation_for_testing):
        """Test getting map data for violations"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.get('/api/violations/map/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'violations' in response.data
        assert 'bounds' in response.data
        assert len(response.data['violations']) > 0
        
        # Check violation structure
        violation = response.data['violations'][0]
        assert 'coordinates' in violation
        assert 'lat' in violation['coordinates']
        assert 'lng' in violation['coordinates']
        assert 'type' in violation
        assert 'severity' in violation
    
    def test_map_filtering(self, api_client, driver_user, violation_for_testing):
        """Test map with filters"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.get('/api/violations/map/', {
            'days': 7,
            'violation_type': 'speeding',
            'status': 'confirmed',
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['filters']['days'] == 7
        assert response.data['filters']['type'] == 'speeding'


# ============================================================================
# Test 5: Payment Installments
# ============================================================================

@pytest.mark.django_db
class TestPaymentInstallments:
    """Test payment installment system"""
    
    def test_create_installment_plan(self, fine_for_testing):
        """Test creating installment plan"""
        result = InstallmentService.create_installment_plan(
            fine=fine_for_testing,
            num_installments=6,
            payment_day_of_month=1,
        )
        
        assert result['success'] is True
        assert 'plan' in result
        assert 'breakdown' in result
        
        plan = result['plan']
        assert plan.num_installments == 6
        assert plan.status == 'active'
        assert plan.payments.count() == 6
        
        # Verify fine status updated
        fine_for_testing.refresh_from_db()
        assert fine_for_testing.status == 'installment'
    
    def test_installment_quote(self, api_client, driver_user, fine_for_testing):
        """Test getting installment quote"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.post(
            f'/api/fines/{fine_for_testing.id}/installments/quote/',
            {'num_installments': 6}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'quote' in response.data
        assert 'options' in response.data
        
        quote = response.data['quote']
        assert quote['num_installments'] == 6
        assert quote['original_amount'] == float(fine_for_testing.amount)
        assert float(quote['total_amount']) > float(fine_for_testing.amount)  # With interest
    
    def test_pay_installment(self, fine_for_testing):
        """Test paying an installment"""
        # Create plan
        result = InstallmentService.create_installment_plan(
            fine=fine_for_testing,
            num_installments=3,
        )
        plan = result['plan']
        
        # Get first payment
        payment = plan.payments.first()
        
        # Pay it
        pay_result = InstallmentService.process_installment_payment(
            payment_id=str(payment.id),
            amount=payment.amount,
            payment_method='khqr',
            payment_reference='TEST123',
        )
        
        assert pay_result['success'] is True
        assert pay_result['remaining_installments'] == 2
        
        # Verify payment status
        payment.refresh_from_db()
        assert payment.status == 'paid'
        assert payment.paid_amount == payment.amount
    
    def test_complete_installment_plan(self, fine_for_testing):
        """Test completing all installments"""
        # Create plan with 2 installments
        result = InstallmentService.create_installment_plan(
            fine=fine_for_testing,
            num_installments=2,
        )
        plan = result['plan']
        
        # Pay both installments
        for payment in plan.payments.all():
            InstallmentService.process_installment_payment(
                payment_id=str(payment.id),
                amount=payment.amount + payment.late_fee,
                payment_method='khqr',
                payment_reference='TEST',
            )
        
        # Verify plan completed
        plan.refresh_from_db()
        assert plan.status == 'completed'
        assert plan.remaining_amount == Decimal('0.00')
        
        # Verify fine paid
        fine_for_testing.refresh_from_db()
        assert fine_for_testing.status == 'paid'


# ============================================================================
# Test 6: Violation Heatmap
# ============================================================================

@pytest.mark.django_db
class TestViolationHeatmap:
    """Test violation heatmap"""
    
    def test_get_heatmap_data(self, api_client, driver_user, violation_for_testing):
        """Test getting heatmap data"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.get('/api/violations/heatmap/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'heatmap' in response.data
        assert 'statistics' in response.data
        assert 'legend' in response.data
        
        # Check heatmap structure
        if response.data['heatmap']:
            point = response.data['heatmap'][0]
            assert 'lat' in point
            assert 'lng' in point
            assert 'intensity' in point
            assert 'count' in point
            assert 'avg_severity' in point
    
    def test_heatmap_by_severity(self, api_client, driver_user, violation_for_testing):
        """Test heatmap with severity intensity"""
        api_client.force_authenticate(user=driver_user)
        
        response = api_client.get('/api/violations/heatmap/', {
            'intensity': 'severity',
            'days': 30,
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['legend']['type'] == 'severity'


# ============================================================================
# Integration Test: Complete Workflow
# ============================================================================

@pytest.mark.django_db
class TestCompleteAdvancedWorkflow:
    """Test complete workflow with all advanced features"""
    
    @patch('notifications.push_service.requests.post')
    @patch('notifications.sms_service.Client')
    @override_settings(
        FCM_SERVER_KEY='test_key',
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_PHONE_NUMBER='+1234567890'
    )
    def test_complete_advanced_workflow(
        self,
        mock_sms_client,
        mock_push_post,
        api_client,
        driver_user,
        fine_for_testing
    ):
        """Test complete workflow: Push, SMS, PDF, Map, Installments"""
        # Mock services
        mock_push_post.return_value = Mock(
            status_code=200,
            json=lambda: {'success': 1}
        )
        mock_sms = Mock(sid='SM123', status='sent')
        mock_sms_client_instance = Mock()
        mock_sms_client_instance.messages.create.return_value = mock_sms
        mock_sms_client.return_value = mock_sms_client_instance
        
        api_client.force_authenticate(user=driver_user)
        
        # 1. Register push device
        push_response = api_client.post('/api/notifications/push/register/', {
            'platform': 'web',
            'device_name': 'Test Browser',
            'web_push_endpoint': 'https://test.com',
            'web_push_p256dh': 'key',
            'web_push_auth': 'secret',
        })
        assert push_response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        
        # 2. Send push and SMS notifications
        from notifications.push_service import notify_fine_push
        from notifications.sms_service import notify_fine_sms
        
        push_result = notify_fine_push(user=driver_user, fine=fine_for_testing)
        sms_result = notify_fine_sms(user=driver_user, fine=fine_for_testing)
        
        # Verify notifications sent (mocked)
        assert push_result is not None
        assert sms_result is not None
        
        # 3. Download PDF receipt
        pdf_response = api_client.get(f'/api/fines/{fine_for_testing.id}/receipt/pdf/')
        assert pdf_response.status_code == status.HTTP_200_OK
        assert pdf_response['Content-Type'] == 'application/pdf'
        
        # 4. Create installment plan
        installment_response = api_client.post(
            f'/api/fines/{fine_for_testing.id}/installments/create/',
            {'num_installments': 3}
        )
        assert installment_response.status_code == status.HTTP_201_CREATED
        
        # 5. View on map (create violation first)
        violation = Violation.objects.create(
            driver=driver_user,
            violation_type='speeding',
            location='Street 51, Phnom Penh',
            violation_date=timezone.now(),
            status='confirmed',
        )
        
        map_response = api_client.get('/api/violations/map/')
        assert map_response.status_code == status.HTTP_200_OK
        
        # 6. View heatmap
        heatmap_response = api_client.get('/api/violations/heatmap/')
        assert heatmap_response.status_code == status.HTTP_200_OK
        
        print("\n✅ Complete advanced workflow test PASSED!")
        print("   - Push notifications: Configured")
        print("   - SMS alerts: Sent")
        print("   - PDF receipt: Generated")
        print("   - Map view: Loaded")
        print("   - Installments: Created")
        print("   - Heatmap: Displayed")


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
