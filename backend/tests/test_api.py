"""Basic API tests for CamTraffic."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AuthAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Test@12345'
        self.user = User.objects.create_user(
            email='test@camtraffic.kh',
            password=self.password,
            full_name='Test Driver',
            role='driver',
        )

    def test_login_success(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))
        self.assertIn('access', res.data['data'])

    def test_login_fail(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': 'wrong',
        })
        self.assertEqual(res.status_code, 401)

    def test_profile_requires_auth(self):
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 401)

    def test_register_rejects_weak_password(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Weak Pass',
            'email': 'weak@camtraffic.kh',
            'password': 'weakpass',
            'password_confirm': 'weakpass',
        })
        self.assertEqual(res.status_code, 400)

    def test_register_accepts_strong_password(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Strong Pass',
            'email': 'strong@camtraffic.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
        })
        self.assertEqual(res.status_code, 201)

    def test_user_portal_rejects_driver_on_police_tab(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
            'portal': 'user',
            'role': 'police',
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn('Driver account', res.data['message'])

    def test_admin_portal_rejects_driver(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
            'portal': 'admin',
        })
        self.assertEqual(res.status_code, 403)

    def test_user_portal_accepts_driver_with_matching_role(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
            'portal': 'user',
            'role': 'driver',
        })
        self.assertEqual(res.status_code, 200)
