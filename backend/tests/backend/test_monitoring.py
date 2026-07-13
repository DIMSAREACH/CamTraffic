"""Health and monitoring endpoint unit tests (Phase 12 — Task 316)."""
from django.test import TestCase
from rest_framework.test import APIClient


class MonitoringEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()

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
        res = self.client.get('/health/status/')
        self.assertEqual(res.status_code, 200)
        payload = res.json()['data']
        for key in ('database', 'media', 'ai_weights', 'disk_free_gb'):
            self.assertIn(key, payload)
