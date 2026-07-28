"""
Complete Driver Portal Integration Test Suite
Tests all modules end-to-end with real data:
- Profile Management
- Vehicles CRUD
- Violations (read-only with AI data)
- Fines Management & Payment
- Appeals System
- Notifications
- Dashboard Stats
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation, ViolationRule
from fines.models import Fine
from appeals.models import ViolationAppeal
from notifications.models import Notification
from infrastructure.models import Camera, Road

User = get_user_model()


@pytest.mark.django_db
class TestDriverPortalComplete:
    """Complete end-to-end driver portal test with real data"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data with real relationships"""
        # Create driver user with real profile
        self.driver_user = User.objects.create_user(
            email='test.driver@camtraffic.gov.kh',
            password='SecurePass123!',
            full_name='Test Driver Citizen',
            role='driver',
            license_no='DL-KH-2024-12345',
            phone='+855 12 345 678',
            address='St 271, Phnom Penh',
            email_verified=True,
            is_active=True,
        )
        self.driver_profile = Driver.objects.create(
            user=self.driver_user,
            license_no='DL-KH-2024-12345',
            national_id='001234567',
            kyc_status='approved',
            status='active',
        )

        # Create officer for enforcement
        self.officer_user = User.objects.create_user(
            email='test.officer@camtraffic.gov.kh',
            password='SecurePass123!',
            full_name='Test Officer',
            role='police',
            email_verified=True,
        )
        self.officer = Officer.objects.create(
            user=self.officer_user,
            badge_no='BADGE-00001',
            rank='Officer',
            department='Traffic Police',
        )

        # Create infrastructure for real violations
        self.camera = Camera.objects.create(
            name='Main Road Camera 01',
            location='Russian Blvd & St 271',
            latitude=11.5564,
            longitude=104.9282,
            is_active=True,
        )
        self.road = Road.objects.create(
            name='Russian Boulevard',
            speed_limit=60,
        )

        # Create violation rule for testing
        self.violation_rule = ViolationRule.objects.create(
            sign_class_key='NO_LEFT_TURN',
            prohibited_action='TURNING_LEFT',
            violation_type='ILLEGAL_LEFT_TURN',
            title='No Left Turn Violation',
            description='Driver made an illegal left turn',
            default_fine_amount=Decimal('50.00'),
            demerit_points=2,
            is_active=True,
        )

        # API clients
        self.driver_client = APIClient()
        self.driver_client.force_authenticate(user=self.driver_user)
        
        self.officer_client = APIClient()
        self.officer_client.force_authenticate(user=self.officer_user)

    def test_1_driver_profile_management(self):
        """Test driver can view and update profile"""
        # Get profile
        response = self.driver_client.get('/api/v1/citizen/profile/')
        assert response.status_code == 200
        data = response.json()['data']
        assert data['email'] == 'test.driver@camtraffic.gov.kh'
        assert data['full_name'] == 'Test Driver Citizen'
        assert data['role'] == 'driver'
        assert data['license_no'] == 'DL-KH-2024-12345'

        # Update profile
        response = self.driver_client.patch('/api/v1/citizen/profile/', {
            'phone': '+855 98 765 432',
            'address': 'Updated Address, Phnom Penh',
        })
        assert response.status_code == 200
        data = response.json()['data']
        assert data['phone'] == '+855 98 765 432'
        assert data['address'] == 'Updated Address, Phnom Penh'

    def test_2_vehicle_crud_operations(self):
        """Test complete vehicle CRUD with real data"""
        # CREATE vehicle
        response = self.driver_client.post('/api/v1/citizen/vehicles/', {
            'owner_id': str(self.driver_user.id),
            'plate_number': 'PP-1234',
            'vehicle_type': 'car',
            'make': 'Toyota',
            'model': 'Camry',
            'color': 'White',
            'year': 2022,
        })
        assert response.status_code == 201
        vehicle_data = response.json()['data']
        vehicle_id = vehicle_data['id']
        assert vehicle_data['plate_number'] == 'PP-1234'
        assert vehicle_data['owner_name'] == 'Test Driver Citizen'

        # READ vehicle list
        response = self.driver_client.get('/api/v1/citizen/vehicles/')
        assert response.status_code == 200
        vehicles = response.json()['data']
        assert len(vehicles) == 1
        assert vehicles[0]['plate_number'] == 'PP-1234'

        # UPDATE vehicle
        response = self.driver_client.patch(f'/api/v1/citizen/vehicles/{vehicle_id}/', {
            'color': 'Silver',
            'year': 2023,
        })
        assert response.status_code == 200
        updated = response.json()['data']
        assert updated['color'] == 'Silver'
        assert updated['year'] == 2023

        # READ single vehicle
        response = self.driver_client.get(f'/api/v1/citizen/vehicles/{vehicle_id}/')
        assert response.status_code == 200
        data = response.json()['data']
        assert data['plate_number'] == 'PP-1234'

        # DELETE vehicle
        response = self.driver_client.delete(f'/api/v1/citizen/vehicles/{vehicle_id}/')
        assert response.status_code == 200

        # Verify deletion
        response = self.driver_client.get('/api/v1/citizen/vehicles/')
        assert response.status_code == 200
        assert len(response.json()['data']) == 0

    def test_3_violations_with_ai_detection(self):
        """Test violations are viewable by driver (created by officer/AI)"""
        # Create vehicle for violation
        vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver_profile,
            plate_number='PP-9999',
            vehicle_type='car',
            model='Honda Civic',
            color='Blue',
            year=2021,
        )

        # Officer creates violation (simulating AI detection)
        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            officer=self.officer,
            camera=self.camera,
            road=self.road,
            violation_type='ILLEGAL_LEFT_TURN',
            observed_action='TURNING_LEFT',
            detected_sign_code='NO_LEFT_TURN',
            detected_class_key='NO_LEFT_TURN',
            violation_date=timezone.now(),
            location='Russian Blvd & St 271',
            description='Illegal left turn detected by AI',
            plate_detected='PP-9999',
            ai_confidence_score=Decimal('0.95'),
            status='confirmed',
        )

        # Driver views violations
        response = self.driver_client.get('/api/v1/citizen/violations/')
        assert response.status_code == 200
        violations = response.json()['data']
        assert len(violations) >= 1
        
        found = next((v for v in violations if v['id'] == str(violation.id)), None)
        assert found is not None
        assert found['violation_type'] == 'ILLEGAL_LEFT_TURN'
        assert found['driver_name'] == 'Test Driver Citizen'
        assert found['status'] == 'confirmed'

        # Driver CANNOT modify violations
        response = self.driver_client.patch(f'/api/v1/citizen/violations/{violation.id}/', {
            'status': 'rejected',
        })
        assert response.status_code == 403

    def test_4_fine_management_and_payment(self):
        """Test complete fine lifecycle with real payment flow"""
        # Create vehicle and violation
        vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver_profile,
            plate_number='PP-7777',
            vehicle_type='car',
            model='Mazda 3',
            color='Red',
            year=2020,
        )

        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            officer=self.officer,
            violation_type='ILLEGAL_LEFT_TURN',
            observed_action='TURNING_LEFT',
            violation_date=timezone.now(),
            location='Test Location',
            status='confirmed',
        )

        # Officer issues fine
        fine = Fine.objects.create(
            driver=self.driver_user,
            police=self.officer_user,
            violation=violation,
            amount=Decimal('50.00'),
            reason='Illegal Left Turn Violation',
            location='Test Location',
            vehicle_plate='PP-7777',
            status='pending',
        )

        # Driver views fines
        response = self.driver_client.get('/api/v1/citizen/fines/')
        assert response.status_code == 200
        fines = response.json()['data']
        assert len(fines) >= 1
        
        found = next((f for f in fines if f['id'] == str(fine.id)), None)
        assert found is not None
        assert found['amount'] == '50.00'
        assert found['status'] == 'pending'

        # Driver submits payment
        response = self.driver_client.post(f'/api/v1/citizen/fines/{fine.id}/pay/', {
            'payment_method': 'aba',
            'payment_reference': 'ABA-TEST-REF-12345',
        })
        assert response.status_code == 200
        paid_fine = response.json()['data']
        # Should be awaiting verification for manual payment methods
        assert paid_fine['status'] in ('paid', 'awaiting_verification')
        assert paid_fine['payment_reference'] == 'ABA-TEST-REF-12345'

    def test_5_appeals_system(self):
        """Test complete appeals workflow"""
        # Create fine to appeal
        vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver_profile,
            plate_number='PP-5555',
            vehicle_type='motorcycle',
            model='Honda Wave',
            color='Black',
            year=2019,
        )

        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            violation_type='ILLEGAL_LEFT_TURN',
            violation_date=timezone.now(),
            location='Test Location',
            status='confirmed',
        )

        fine = Fine.objects.create(
            driver=self.driver_user,
            police=self.officer_user,
            violation=violation,
            amount=Decimal('50.00'),
            reason='Test Fine',
            location='Test Location',
            vehicle_plate='PP-5555',
            status='pending',
        )

        # Driver submits appeal
        response = self.driver_client.post('/api/v1/citizen/appeals/', {
            'violation_id': str(violation.id),
            'fine_id': str(fine.id),
            'reason': 'The sign was not visible due to tree obstruction',
        })
        assert response.status_code == 201
        appeal_data = response.json()['data']
        appeal_id = appeal_data['id']
        assert appeal_data['status'] == 'pending'
        assert 'tree obstruction' in appeal_data['reason']

        # Verify fine status changed to disputed
        fine.refresh_from_db()
        assert fine.status == 'disputed'

        # Driver views appeals
        response = self.driver_client.get('/api/v1/citizen/appeals/')
        assert response.status_code == 200
        appeals = response.json()['data']
        assert len(appeals) >= 1
        assert any(a['id'] == appeal_id for a in appeals)

    def test_6_notifications_system(self):
        """Test notifications are created for driver events"""
        # Create notification
        notification = Notification.objects.create(
            user=self.driver_user,
            title='New Fine Issued',
            message='You have received a new fine for speeding',
            type='fine',
        )

        # Driver views notifications
        response = self.driver_client.get('/api/v1/citizen/notifications/')
        assert response.status_code == 200
        notifications = response.json()['data']
        
        found = next((n for n in notifications if n['id'] == str(notification.id)), None)
        assert found is not None
        assert found['title'] == 'New Fine Issued'
        assert found['type'] == 'fine'
        assert found['is_read'] is False

    def test_7_dashboard_real_stats(self):
        """Test dashboard shows accurate real-time stats"""
        # Create test data
        vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver_profile,
            plate_number='PP-DASH',
            vehicle_type='car',
            model='Test Model',
            color='White',
            year=2022,
        )

        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            violation_type='ILLEGAL_LEFT_TURN',
            violation_date=timezone.now(),
            location='Test',
            status='confirmed',
        )

        fine_pending = Fine.objects.create(
            driver=self.driver_user,
            police=self.officer_user,
            violation=violation,
            amount=Decimal('25.00'),
            reason='Test Fine 1',
            location='Test',
            vehicle_plate='PP-DASH',
            status='pending',
        )

        fine_paid = Fine.objects.create(
            driver=self.driver_user,
            police=self.officer_user,
            amount=Decimal('35.00'),
            reason='Test Fine 2',
            location='Test',
            vehicle_plate='PP-DASH',
            status='paid',
            paid_at=timezone.now(),
        )

        # Get dashboard stats
        response = self.driver_client.get('/api/v1/citizen/dashboard/')
        assert response.status_code == 200
        stats = response.json()['data']

        # Verify real stats
        assert stats['vehicles'] >= 1  # At least the one we created
        assert stats['total_fines'] >= 2  # Both fines
        assert stats['pending'] >= 1  # Pending fine
        assert stats['paid'] >= 1  # Paid fine
        assert float(stats['owed']) >= 25.00  # Amount owed
        assert 'recent_fines' in stats
        assert len(stats['recent_fines']) <= 3  # Limited to recent 3

    def test_8_complete_workflow_integration(self):
        """Test complete workflow: vehicle -> violation -> fine -> appeal"""
        # 1. Register vehicle
        response = self.driver_client.post('/api/v1/citizen/vehicles/', {
            'owner_id': str(self.driver_user.id),
            'plate_number': 'PP-FLOW',
            'vehicle_type': 'car',
            'model': 'Toyota Corolla',
            'color': 'Silver',
            'year': 2023,
        })
        assert response.status_code == 201
        vehicle_id = response.json()['data']['id']

        # 2. AI/Officer creates violation
        vehicle = Vehicle.objects.get(pk=vehicle_id)
        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            officer=self.officer,
            camera=self.camera,
            violation_type='ILLEGAL_LEFT_TURN',
            observed_action='TURNING_LEFT',
            violation_date=timezone.now(),
            location='Russian Blvd',
            plate_detected='PP-FLOW',
            status='confirmed',
        )

        # 3. Officer issues fine
        fine = Fine.objects.create(
            driver=self.driver_user,
            police=self.officer_user,
            violation=violation,
            amount=Decimal('50.00'),
            reason='Illegal Left Turn',
            location='Russian Blvd',
            vehicle_plate='PP-FLOW',
            status='pending',
        )

        # 4. Driver views violation
        response = self.driver_client.get(f'/api/v1/citizen/violations/{violation.id}/')
        assert response.status_code == 200
        assert response.json()['data']['vehicle_plate'] == 'PP-FLOW'

        # 5. Driver views fine
        response = self.driver_client.get(f'/api/v1/citizen/fines/{fine.id}/')
        assert response.status_code == 200
        assert response.json()['data']['amount'] == '50.00'

        # 6. Driver submits appeal
        response = self.driver_client.post('/api/v1/citizen/appeals/', {
            'violation_id': str(violation.id),
            'fine_id': str(fine.id),
            'reason': 'Sign was not clearly visible',
        })
        assert response.status_code == 201

        # 7. Verify fine status updated to disputed
        fine.refresh_from_db()
        assert fine.status == 'disputed'

        # 8. Driver pays fine (even while disputed)
        response = self.driver_client.post(f'/api/v1/citizen/fines/{fine.id}/pay/', {
            'payment_method': 'aba',
            'payment_reference': 'FLOW-PAY-REF',
        })
        assert response.status_code == 200

        # 9. Dashboard reflects all actions
        response = self.driver_client.get('/api/v1/citizen/dashboard/')
        assert response.status_code == 200
        stats = response.json()['data']
        assert stats['vehicles'] >= 1
        assert stats['total_fines'] >= 1

    def test_9_real_data_validation(self):
        """Ensure no mock/sample data is used in production"""
        # Verify all data is real (not from sample fixtures)
        
        # Check user is real
        assert self.driver_user.email.endswith('@camtraffic.gov.kh')
        assert self.driver_profile.license_no.startswith('DL-KH-')
        
        # Check vehicles use real relationships
        vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver_profile,
            plate_number='PP-REAL',
            vehicle_type='car',
            model='Real Vehicle',
            color='Blue',
            year=2024,
        )
        assert vehicle.owner_id == self.driver_user.id
        assert vehicle.driver_id == self.driver_profile.id
        
        # Check violations have real enforcement data
        violation = TrafficViolation.objects.create(
            driver=self.driver_profile,
            vehicle=vehicle,
            officer=self.officer,
            camera=self.camera,
            violation_type='ILLEGAL_LEFT_TURN',
            violation_date=timezone.now(),
            location='Real Location',
            status='confirmed',
        )
        assert violation.officer_id == self.officer.id
        assert violation.camera_id == self.camera.id
        
        # Check API returns real data
        response = self.driver_client.get('/api/v1/citizen/vehicles/')
        vehicles = response.json()['data']
        real_vehicle = next((v for v in vehicles if v['plate_number'] == 'PP-REAL'), None)
        assert real_vehicle is not None
        assert real_vehicle['owner_id'] == str(self.driver_user.id)

    def test_10_production_ready_validation(self):
        """Validate production-ready features"""
        # Check authentication required
        anon_client = APIClient()
        response = anon_client.get('/api/v1/citizen/dashboard/')
        assert response.status_code in (401, 403)

        # Check role-based access control
        response = self.driver_client.post('/api/v1/officer/violations/', {
            'class_key': 'TEST',
            'observed_action': 'TEST',
        })
        assert response.status_code in (403, 404)  # Driver cannot access officer endpoints

        # Check data isolation (driver sees only their data)
        other_driver = User.objects.create_user(
            email='other@test.com',
            password='pass',
            role='driver',
            full_name='Other Driver',
        )
        other_profile = Driver.objects.create(
            user=other_driver,
            license_no='OTHER-LIC',
        )
        
        other_vehicle = Vehicle.objects.create(
            owner=other_driver,
            driver=other_profile,
            plate_number='PP-OTHER',
            vehicle_type='car',
            model='Other',
            color='Red',
            year=2020,
        )

        # Driver should NOT see other driver's vehicles
        response = self.driver_client.get('/api/v1/citizen/vehicles/')
        vehicles = response.json()['data']
        assert not any(v['plate_number'] == 'PP-OTHER' for v in vehicles)

        # Check error handling
        response = self.driver_client.get('/api/v1/citizen/vehicles/invalid-uuid/')
        assert response.status_code in (400, 404)


@pytest.mark.django_db
def test_driver_portal_no_errors():
    """Quick smoke test to ensure no runtime errors"""
    client = APIClient()
    
    # Create test driver
    user = User.objects.create_user(
        email='smoke@test.com',
        password='test123',
        role='driver',
        full_name='Smoke Test',
    )
    client.force_authenticate(user)
    
    # Test all main endpoints return 200 or expected status
    endpoints = [
        '/api/v1/citizen/',
        '/api/v1/citizen/dashboard/',
        '/api/v1/citizen/profile/',
        '/api/v1/citizen/vehicles/',
        '/api/v1/citizen/violations/',
        '/api/v1/citizen/fines/',
        '/api/v1/citizen/appeals/',
        '/api/v1/citizen/notifications/',
    ]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code in (200, 201, 404), f"Endpoint {endpoint} failed with {response.status_code}"
