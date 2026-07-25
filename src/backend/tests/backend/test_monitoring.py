"""Health and monitoring endpoint unit tests (Phase 12 — Task 316)."""
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

class MonitoringEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create admin user for authenticated monitoring endpoint
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='admin',
            full_name='Test Admin'
        )

    def test_health_returns_ok(self):
        res = self.client.get('/health/')
        self.assertEqual(res.status_code, 200)
        payload = res.json()['data']
        self.assertEqual(payload['status'], 'ok')
        self.assertEqual(payload['service'], 'camtraffic-api')

    def test_health_ready_checks_database(self):
        res = self.client.get('/health/ready/')
        self.assertEqual(res.status_code, 200)
        payload = res.json()['data']
        self.assertEqual(payload['status'], 'ready')
        self.assertEqual(payload['database'], 'ok')

    def test_monitoring_status_includes_subsystems(self):
        # Authenticate as admin user since monitoring status requires authentication
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/health/status/')
        self.assertEqual(res.status_code, 200)
        payload = res.json()['data']
        for key in ('database', 'media', 'ai_weights', 'disk_free_gb'):
            self.assertIn(key, payload)
