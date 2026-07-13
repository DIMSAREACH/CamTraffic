"""Integration: login → profile → dashboard (Phase 12 — Task 318)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class AuthProfileDashboardFlowTest(APITestCase):
    def setUp(self):
        self.password = 'Admin@12345'
        self.admin = User.objects.create_user(
            email='flow-admin@test.kh',
            password=self.password,
            full_name='Flow Admin',
            role='admin',
        )

    def test_admin_login_profile_dashboard_chain(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'flow-admin@test.kh',
            'password': self.password,
            'portal': 'admin',
        })
        self.assertEqual(login.status_code, 200, login.content)
        tokens = login.json()['data']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')

        profile = self.client.get('/api/auth/profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()['data']['role'], 'admin')

        overview = self.client.get('/api/auth/profile/overview/')
        self.assertEqual(overview.status_code, 200)
        self.assertIn('preferences', overview.json()['data'])

        dashboard = self.client.get('/api/dashboard/admin/')
        self.assertEqual(dashboard.status_code, 200)
        stats = dashboard.json()['data']
        for field in ('total_users', 'total_detections', 'total_fines', 'total_violations'):
            self.assertIn(field, stats)

    def test_driver_login_profile_notifications_chain(self):
        driver = User.objects.create_user(
            email='flow-driver@test.kh',
            password='Driver@12345',
            full_name='Flow Driver',
            role='driver',
        )
        login = self.client.post('/api/auth/login/', {
            'email': driver.email,
            'password': 'Driver@12345',
            'portal': 'user',
            'role': 'driver',
        })
        self.assertEqual(login.status_code, 200)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {login.json()["data"]["access"]}',
        )

        profile = self.client.get('/api/auth/profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()['data']['role'], 'driver')

        notifications = self.client.get('/api/notifications/')
        self.assertEqual(notifications.status_code, 200)
        self.assertIn('data', notifications.json())
