"""Vehicle registration must link an admin/officer-created car to a driver."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import Driver
from vehicles.models import Vehicle

User = get_user_model()


class VehicleRegistrationOwnerTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='vehicle-admin@test.kh',
            password='Test@12345',
            full_name='Vehicle Admin',
            role='admin',
        )
        self.officer = User.objects.create_user(
            email='vehicle-officer@test.kh',
            password='Test@12345',
            full_name='Vehicle Officer',
            role='police',
        )
        self.driver_user = User.objects.create_user(
            email='vehicle-driver@test.kh',
            password='Test@12345',
            full_name='Vehicle Driver',
            role='driver',
            license_no='DL-VEHICLE-01',
        )
        self.driver, _ = Driver.objects.get_or_create(
            user=self.driver_user,
            defaults={'license_no': 'DL-VEHICLE-01'},
        )
        self.client = APIClient()

    def _payload(self, plate: str) -> dict:
        return {
            'owner_id': str(self.driver_user.id),
            'plate_number': plate,
            'vehicle_type': 'car',
            'model': 'Toyota Camry',
            'color': 'Silver',
            'year': 2026,
        }

    def test_admin_can_register_vehicle_for_selected_driver(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/vehicles/', self._payload('2AA 4321'), format='json')
        self.assertEqual(response.status_code, 201)
        vehicle = Vehicle.objects.get(plate_number='2AA 4321')
        self.assertEqual(vehicle.owner_id, self.driver_user.id)
        self.assertEqual(vehicle.driver_id, self.driver.id)

    def test_officer_can_register_vehicle_for_selected_driver(self):
        self.client.force_authenticate(self.officer)
        response = self.client.post('/api/vehicles/', self._payload('2AB 9876'), format='json')
        self.assertEqual(response.status_code, 201)
        vehicle = Vehicle.objects.get(plate_number='2AB 9876')
        self.assertEqual(vehicle.owner_id, self.driver_user.id)
        self.assertEqual(vehicle.driver_id, self.driver.id)

    def test_admin_must_select_driver(self):
        self.client.force_authenticate(self.admin)
        payload = self._payload('2AC 5555')
        payload.pop('owner_id')
        response = self.client.post('/api/vehicles/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Vehicle.objects.filter(plate_number='2AC 5555').exists())
