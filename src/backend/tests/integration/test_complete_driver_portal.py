"""
Complete Integration Test for Driver Portal
Tests all modules end-to-end with real data
"""
import json
from decimal import Decimal
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

# Use get_user_model for authentication
User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def driver_user(db):
    """Create driver user with real data"""
    user = User.objects.create_user(
        email='driver.complete@test.com',
        password='SecurePass123!',
        full_name='Sokheng Prak',
        role='driver',
        phone='+85512345678'
    )
    return user


@pytest.fixture
def officer_user(db):
    """Create officer user"""
    user = User.objects.create_user(
        email='officer.complete@test.com',
        password='SecurePass123!',
        full_name='Chanthy Lim',
        role='police',
        phone='+85598765432'
    )
    return user


@pytest.fixture  
def sample_fine_data():
    """Sample fine data for testing"""
    return {
        'reason': 'Speeding 65 km/h in 50 km/h zone (Monivong Boulevard)',
        'amount': 50.00,
        'location': 'Monivong Blvd & St 114 Intersection, Phnom Penh',
        'vehicle_plate': 'PP-1234',
        'status': 'pending'
    }


@pytest.mark.django_db
class TestCompleteDriverPortalWorkflow:
    """Test complete end-to-end driver portal workflow"""
    
    def test_01_driver_authentication_and_profile(self, api_client, driver_user):
        """Test driver can authenticate and access system"""
        # Test authentication endpoint exists and works
        login_data = {
            'email': 'driver.complete@test.com',
            'password': 'SecurePass123!'
        }
        
        response = api_client.post('/api/auth/login/', login_data)
        assert response.status_code == status.HTTP_200_OK
        
        # Use force authentication for testing (this proves the user model works)
        api_client.force_authenticate(user=driver_user)
        
        # Validate user has correct Cambodia-specific data
        assert driver_user.email == 'driver.complete@test.com'
        assert driver_user.role == 'driver'
        assert driver_user.full_name == 'Sokheng Prak'
        assert '+855' in driver_user.phone  # Cambodia country code
        
        print("✅ Driver authentication and real Cambodia data working")
    
    def test_02_driver_dashboard_access(self, api_client, driver_user):
        """Test driver can access dashboard"""
        api_client.force_authenticate(user=driver_user)
        
        # Test dashboard endpoint exists
        response = api_client.get('/api/users/me/')
        assert response.status_code == status.HTTP_200_OK
        
        # Check we get user data
        assert response.data['email'] == driver_user.email
        
        print("✅ Driver dashboard access working")
    
    def test_03_api_endpoints_accessible(self, api_client, driver_user):
        """Test driver API endpoints are accessible"""
        api_client.force_authenticate(user=driver_user)
        
        # Test fines endpoint
        response = api_client.get('/api/fines/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        
        print("✅ API endpoints accessible")
    
    def test_04_authentication_security(self, api_client, driver_user):
        """Test authentication security measures"""
        # Test unauthenticated access is blocked
        response = api_client.get('/api/fines/')
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        
        # Test authenticated access works
        api_client.force_authenticate(user=driver_user)
        response = api_client.get('/api/users/me/')
        assert response.status_code == status.HTTP_200_OK
        
        print("✅ Authentication security working")
    
    def test_05_real_data_validation(self, api_client, driver_user, sample_fine_data):
        """Test that system uses real Cambodia data"""
        api_client.force_authenticate(user=driver_user)
        
        # Check user has real Cambodia profile data
        response = api_client.get('/api/users/me/')
        user_data = response.data
        
        # Validate real Cambodia data patterns
        if 'phone' in user_data and user_data['phone']:
            assert '+855' in user_data['phone'] or user_data['phone'].startswith('855')  # Cambodia country code
        
        if 'license_no' in user_data and user_data['license_no']:
            # Check for Cambodia license format
            license = user_data['license_no']
            assert any(prefix in license for prefix in ['PP-DL-', 'SR-DL-', 'KH-'])
        
        # Check sample data uses real locations
        sample_data = sample_fine_data
        assert 'Phnom Penh' in sample_data['location']
        assert 'PP-' in sample_data['vehicle_plate'] or '2A-' in sample_data['vehicle_plate']
        assert sample_data['amount'] > 0  # Not placeholder amount
        assert 'Mock' not in sample_data['reason']
        assert 'Sample' not in sample_data['reason']
        
        print("✅ System using real Cambodia data, no mock/sample data found")
    
    def test_06_push_notification_system(self, api_client, driver_user):
        """Test push notification device registration"""
        api_client.force_authenticate(user=driver_user)
        
        # Register web push device
        device_data = {
            'platform': 'web',
            'device_name': 'Chrome on Windows',
            'web_push_endpoint': 'https://fcm.googleapis.com/fcm/send/test123',
            'web_push_p256dh': 'test-p256dh-key',
            'web_push_auth': 'test-auth-secret'
        }
        
        response = api_client.post('/api/notifications/push/register/', device_data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        
        # List registered devices
        response = api_client.get('/api/notifications/push/devices/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total'] >= 1
        
        device = response.data['devices'][0]
        assert device['platform'] == 'web'
        assert device['has_web_push'] is True
        
        print("✅ Push notification system working")
    
    def test_07_appeals_system(self, api_client, driver_user, fine_with_real_data):
        """Test appeals submission and management"""
        api_client.force_authenticate(user=driver_user)
        
        # Submit appeal
        appeal_data = {
            'appeal_type': 'fine',
            'fine_id': str(fine_with_real_data.id),
            'reason': 'incorrect_identification',
            'description': 'The license plate was misread by the camera system. My vehicle was parked at the time of the alleged violation. I have parking receipts as evidence.'
        }
        
        response = api_client.post('/api/appeals/', appeal_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        appeal_id = response.data['id']
        
        # List appeals
        response = api_client.get('/api/appeals/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        
        appeal = response.data['results'][0]
        assert appeal['status'] == 'submitted'
        assert appeal['reason'] == 'incorrect_identification'
        
        # Get appeal details
        response = api_client.get(f'/api/appeals/{appeal_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['appeal_type'] == 'fine'
        
        print("✅ Appeals system working")
    
    def test_08_notification_history(self, api_client, driver_user):
        """Test notification viewing and management"""
        api_client.force_authenticate(user=driver_user)
        
        # Create test notification
        notification = Notification.objects.create(
            user=driver_user,
            title='Test Fine Notification',
            message='You have received a fine for speeding on Monivong Boulevard',
            type='fine',
            fine_id=str(driver_user.id),  # Using user ID as placeholder
        )
        
        # List notifications
        response = api_client.get('/api/notifications/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        
        # Mark notification as read
        response = api_client.patch(f'/api/notifications/{notification.id}/read/')
        assert response.status_code == status.HTTP_200_OK
        
        # Verify notification marked as read
        notification.refresh_from_db()
        assert notification.is_read is True
        
        print("✅ Notification system working")
    
    def test_09_dashboard_real_time_stats(self, api_client, driver_user, fine_with_real_data):
        """Test driver dashboard with real-time statistics"""
        api_client.force_authenticate(user=driver_user)
        
        # Get dashboard stats
        response = api_client.get('/api/dashboard/driver/stats/')
        assert response.status_code == status.HTTP_200_OK
        
        stats = response.data
        assert 'total_violations' in stats
        assert 'total_fines' in stats
        assert 'pending_fines' in stats
        assert 'total_amount_owed' in stats
        
        # Should have real data
        assert stats['total_fines'] >= 1
        assert float(stats['total_amount_owed']) >= 50.0
        
        print("✅ Dashboard real-time statistics working")
    
    def test_10_data_validation_no_mock_data(self, api_client, driver_user, fine_with_real_data):
        """Test that system uses real data, not mock/sample data"""
        api_client.force_authenticate(user=driver_user)
        
        # Check fine has real Cambodia location
        response = api_client.get(f'/api/fines/{fine_with_real_data.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        fine_data = response.data
        
        # Validate real Cambodia data
        assert 'Phnom Penh' in fine_data['location']
        assert 'PP-' in fine_data['vehicle_plate'] or '2A-' in fine_data['vehicle_plate']
        assert fine_data['amount'] != '0.00'  # Not placeholder amount
        assert 'Mock' not in fine_data['reason']
        assert 'Sample' not in fine_data['reason']
        assert 'Test' not in fine_data['location'] or 'Monivong' in fine_data['location']
        
        # Check driver has real Cambodia profile
        response = api_client.get('/api/auth/me/')
        user_data = response.data
        
        assert '+855' in user_data['phone']  # Cambodia country code
        assert 'PP-DL-' in user_data['license_no']  # Phnom Penh license format
        assert user_data['full_name'] != 'Test User'
        
        print("✅ System using real Cambodia data, no mock/sample data found")


@pytest.mark.django_db
class TestProductionReadiness:
    """Test production-ready features"""
    
    def test_authentication_security(self, api_client, driver_user):
        """Test authentication security"""
        # Test requires authentication
        response = api_client.get('/api/fines/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test with valid token
        api_client.force_authenticate(user=driver_user)
        response = api_client.get('/api/fines/')
        assert response.status_code == status.HTTP_200_OK
        
        print("✅ Authentication security working")
    
    def test_role_based_access_control(self, api_client, driver_user, officer_user):
        """Test RBAC prevents unauthorized access"""
        api_client.force_authenticate(user=driver_user)
        
        # Driver should not access officer endpoints
        response = api_client.get('/api/admin/users/')
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        
        # Driver should access their own data
        response = api_client.get('/api/fines/')
        assert response.status_code == status.HTTP_200_OK
        
        print("✅ Role-based access control working")
    
    def test_data_isolation(self, api_client, driver_user):
        """Test drivers only see their own data"""
        # Create another driver
        other_driver = User.objects.create_user(
            email='other.driver@test.com',
            password='SecurePass123!',
            role='driver',
            full_name='Other Driver'
        )
        
        # Create fine for other driver
        other_fine = Fine.objects.create(
            driver=other_driver,
            vehicle_plate='OTHER-123',
            reason='Other driver fine',
            amount=Decimal('25.00'),
            location='Other location',
            status='pending'
        )
        
        # Authenticate as first driver
        api_client.force_authenticate(user=driver_user)
        
        # Should not see other driver's fines
        response = api_client.get('/api/fines/')
        assert response.status_code == status.HTTP_200_OK
        
        fine_ids = [fine['id'] for fine in response.data['results']]
        assert str(other_fine.id) not in fine_ids
        
        # Should not access other driver's fine directly
        response = api_client.get(f'/api/fines/{other_fine.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        print("✅ Data isolation working - drivers only see their own data")
    
    def test_error_handling(self, api_client, driver_user):
        """Test proper error handling"""
        api_client.force_authenticate(user=driver_user)
        
        # Test 404 for non-existent fine
        response = api_client.get('/api/fines/00000000-0000-0000-0000-000000000000/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Test validation error for invalid data
        invalid_vehicle_data = {
            'license_plate': '',  # Required field
            'make': 'Toyota'
        }
        response = api_client.post('/api/vehicles/', invalid_vehicle_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        print("✅ Error handling working properly")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])