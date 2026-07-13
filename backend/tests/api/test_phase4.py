"""Phase 4 API tests — officers, drivers, stations, OCR, versioning."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from infrastructure.models import PoliceStation
from users.models import Driver, Officer

User = get_user_model()


class Phase4APITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='phase4-admin@camtraffic.kh',
            password='Admin@12345',
            full_name='Phase4 Admin',
            role='admin',
        )
        self.police = User.objects.create_user(
            email='phase4-police@camtraffic.kh',
            password='Police@12345',
            full_name='Phase4 Police',
            role='police',
        )
        from users.profile_services import provision_user_account

        provision_user_account(self.police, badge_no='BADGE-P4-01')
        self.client.force_authenticate(user=self.admin)

    def test_officers_list(self):
        res = self.client.get('/api/officers/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))

    def test_create_police_station(self):
        res = self.client.post('/api/officers/stations/', {
            'name': 'Central Traffic HQ',
            'code': 'CTHQ-01',
            'city': 'Phnom Penh',
            'status': 'active',
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(PoliceStation.objects.filter(code='CTHQ-01').exists())

    def test_create_driver_via_api(self):
        res = self.client.post('/api/drivers/', {
            'full_name': 'New Driver',
            'email': 'newdriver@camtraffic.kh',
            'password': 'Driver@12345',
            'license_no': 'LIC-P4-NEW',
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Driver.objects.filter(license_no='LIC-P4-NEW').exists())

    def test_api_v1_alias(self):
        res = self.client.get('/api/v1/rbac/permissions/')
        self.assertEqual(res.status_code, 200)

    def test_ocr_list(self):
        res = self.client.get('/api/ocr/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data.get('data', {}))

    def test_officers_v1_alias(self):
        res = self.client.get('/api/v1/officers/')
        self.assertEqual(res.status_code, 200)

    def test_assign_officer_to_station(self):
        station = PoliceStation.objects.create(name='Station B', code='ST-B', city='Siem Reap')
        officer = Officer.objects.get(user=self.police)
        res = self.client.patch(f'/api/officers/{officer.id}/', {'station': str(station.id)}, format='json')
        self.assertEqual(res.status_code, 200)
        officer.refresh_from_db()
        self.assertEqual(officer.station_id, station.id)
