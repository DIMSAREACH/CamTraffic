"""API tests: health, auth, users (Phase 12 — Task 317)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class HealthAPITest(APITestCase):
    def test_root_is_public(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body['success'])
        self.assertEqual(body['data']['health'], '/health/')

    def test_root_head(self):
        res = self.client.head('/')
        self.assertEqual(res.status_code, 200)

    def test_health_is_public(self):
        res = self.client.get('/health/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['success'])


class AuthAPITest(APITestCase):
    def setUp(self):
        self.password = 'Test@12345'
        self.user = User.objects.create_user(
            email='api-auth@test.kh',
            password=self.password,
            full_name='API Auth User',
            role='driver',
        )

    def test_login_returns_jwt_pair(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'api-auth@test.kh',
            'password': self.password,
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()['data']
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_rejects_wrong_password(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'api-auth@test.kh',
            'password': 'wrong-password',
        })
        self.assertEqual(res.status_code, 401)

    def test_register_creates_driver_account(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'New Driver',
            'email': 'newdriver@test.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(User.objects.filter(email='newdriver@test.kh').exists())

    def test_register_rejects_duplicate_email(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Dup',
            'email': 'api-auth@test.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
        })
        self.assertEqual(res.status_code, 400)

    def test_profile_requires_authentication(self):
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 401)

    def test_profile_returns_user_when_authenticated(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'api-auth@test.kh',
            'password': self.password,
        })
        token = login.json()['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['data']['email'], 'api-auth@test.kh')


class UsersAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='api-admin@test.kh',
            password='Admin@12345',
            full_name='API Admin',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='api-driver@test.kh',
            password='Driver@12345',
            full_name='API Driver',
            role='driver',
        )

    def test_users_list_requires_admin(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'api-driver@test.kh',
            'password': 'Driver@12345',
        })
        token = login.json()['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_list_users(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'api-admin@test.kh',
            'password': 'Admin@12345',
            'portal': 'admin',
        })
        token = login.json()['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        rows = payload.get('results') or payload.get('data') or []
        emails = [row['email'] for row in rows]
        self.assertIn('api-driver@test.kh', emails)


class PasswordResetAPITest(APITestCase):
    def setUp(self):
        User.objects.create_user(
            email='reset@test.kh',
            password='Reset@12345',
            full_name='Reset User',
            role='driver',
        )

    def test_password_reset_without_email_returns_503_not_500(self):
        res = self.client.post('/api/auth/password-reset/', {'email': 'reset@test.kh'})
        self.assertIn(res.status_code, (400, 503))
        self.assertFalse(res.json()['success'])
