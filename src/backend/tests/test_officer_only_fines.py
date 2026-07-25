"""Regression: only officers may issue fines (admin/citizen blocked)."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class OfficerOnlyFinesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin-prod-test@example.com',
            password='TestPass123!',
            full_name='Admin',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='driver-prod-test@example.com',
            password='TestPass123!',
            full_name='Driver',
            role='driver',
        )

    def test_admin_cannot_issue_fine_via_legacy_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fines/', {
            'driver_id': str(self.driver.id),
            'amount': 10,
            'reason': 'should fail',
            'location': 'test',
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_issue_fine_via_officer_namespace(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/officer/fines/issue/', {
            'driver_id': str(self.driver.id),
            'amount': 10,
            'reason': 'should fail',
            'location': 'test',
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_driver_cannot_access_officer_detection_queue(self):
        self.client.force_authenticate(user=self.driver)
        res = self.client.get('/api/v1/officer/detection-queue/')
        self.assertEqual(res.status_code, 403)
