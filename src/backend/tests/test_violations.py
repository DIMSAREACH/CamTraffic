"""Tests for traffic violation detection and API."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from ai_detection.models import AIDetectionLog
from users.models import Driver
from vehicles.models import Vehicle
from violations.models import TrafficViolation, ViolationRule
from violations.services import evaluate_violation, seed_default_rules

User = get_user_model()


class ViolationDetectionTest(TestCase):
    def setUp(self):
        seed_default_rules()

    def test_illegal_left_turn(self):
        result = evaluate_violation(
            class_key='NO_LEFT_TURN',
            observed_action='LEFT_TURN',
            sign_code='PW03-R1-01',
        )
        self.assertIsNotNone(result)
        self.assertEqual(result['violation_type'], 'ILLEGAL_LEFT_TURN')

    def test_no_violation_when_action_allowed(self):
        result = evaluate_violation(
            class_key='NO_LEFT_TURN',
            observed_action='RIGHT_TURN',
        )
        self.assertIsNone(result)

    def test_road_closed_violation(self):
        result = evaluate_violation(
            class_key='ROAD_CLOSED_ALL_USERS',
            observed_action='ENTER',
        )
        self.assertEqual(result['violation_type'], 'ROAD_CLOSED')


class ViolationAPITest(TestCase):
    def setUp(self):
        seed_default_rules()
        self.client = APIClient()
        self.password = 'Test@12345'
        self.admin = User.objects.create_user(
            email='admin@camtraffic.kh',
            password=self.password,
            full_name='Admin User',
            role='admin',
        )
        self.driver_user = User.objects.create_user(
            email='driver@camtraffic.kh',
            password=self.password,
            full_name='Driver User',
            role='driver',
            license_no='LIC-9001',
        )
        self.driver, _ = Driver.objects.get_or_create(
            user=self.driver_user,
            defaults={'license_no': 'LIC-9001'},
        )

    def _login(self, user):
        res = self.client.post('/api/auth/login/', {
            'email': user.email,
            'password': self.password,
        })
        token = res.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_evaluate_violation_endpoint(self):
        self._login(self.admin)
        res = self.client.post('/api/violations/evaluate/', {
            'class_key': 'NO_U_TURN',
            'observed_action': 'U_TURN',
            'sign_code': 'PW03-R1-03',
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['data']['is_violation'])
        self.assertEqual(res.data['data']['violation_type'], 'ILLEGAL_U_TURN')

    def test_create_violation_record(self):
        self._login(self.admin)
        res = self.client.post('/api/violations/', {
            'driver_id': self.driver.id,
            'class_key': 'NO_PARKING',
            'observed_action': 'PARKING',
            'location': 'Street 271',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(TrafficViolation.objects.count(), 1)
        violation = TrafficViolation.objects.first()
        self.assertEqual(violation.violation_type, 'NO_PARKING')

    def test_create_violation_from_ai_detection_log(self):
        self.vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver,
            plate_number='3B-5678',
            vehicle_type='car',
            make='Toyota',
            model='Corolla',
            color='Blue',
            year=2021,
        )
        self._login(self.admin)
        log = AIDetectionLog.objects.create(
            user=self.admin,
            uploaded_image='ai/uploads/sample.jpg',
            detected_sign='No Parking',
            confidence=88.0,
            description='Auto-detection',
            guidance='Do not park here',
            processing_time=0.9,
            matched_vehicle=self.vehicle,
        )
        res = self.client.post('/api/violations/', {
            'class_key': 'NO_PARKING',
            'observed_action': 'PARKING',
            'location': 'Street 271',
            'ai_detection_log_id': str(log.id),
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(TrafficViolation.objects.count(), 1)
        violation = TrafficViolation.objects.first()
        self.assertEqual(violation.violation_type, 'NO_PARKING')
        self.assertEqual(violation.ai_detection_log_id, log.id)
        self.assertEqual(violation.driver_id, self.driver.id)

    def test_create_violation_from_ai_detection_log_plate_fallback(self):
        self.vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver,
            plate_number='76555',
            vehicle_type='car',
            make='Honda',
            model='Civic',
            color='Red',
            year=2020,
        )
        self._login(self.admin)
        log = AIDetectionLog.objects.create(
            user=self.admin,
            uploaded_image='ai/uploads/sample.jpg',
            detected_sign='ឈប់',
            confidence=88.0,
            description='Auto-detection',
            guidance='Do not stop here',
            processing_time=0.9,
            detected_plate='76555',
        )
        res = self.client.post('/api/violations/', {
            'class_key': 'NO_STOPPING',
            'observed_action': 'STOPPING',
            'location': 'Street 272',
            'ai_detection_log_id': str(log.id),
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(TrafficViolation.objects.count(), 1)
        violation = TrafficViolation.objects.first()
        self.assertEqual(violation.violation_type, 'NO_STOPPING')
        self.assertEqual(violation.ai_detection_log_id, log.id)
        self.assertEqual(violation.driver_id, self.driver.id)

    def test_list_violations_as_driver(self):
        TrafficViolation.objects.create(
            driver=self.driver,
            violation_type='NO_PARKING',
            observed_action='PARKING',
            detected_class_key='NO_PARKING',
            violation_date='2026-06-05T10:00:00Z',
            location='Demo',
            status='confirmed',
        )
        self._login(self.driver_user)
        res = self.client.get('/api/violations/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['data']), 1)

    def test_violation_stats(self):
        self._login(self.admin)
        res = self.client.get('/api/violations/stats/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('total_violations', res.data['data'])

    def test_rules_list(self):
        self._login(self.admin)
        res = self.client.get('/api/violations/rules/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data['data']), 5)
