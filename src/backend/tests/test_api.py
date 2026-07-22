"""Basic API tests for CamTraffic."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from rbac.models import UserRole
from users.models import Driver

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

    def test_register_creates_driver_profile_and_user_role(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Profile Test',
            'email': 'profile@camtraffic.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
            'license_no': 'LIC-PROFILE-01',
        })
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='profile@camtraffic.kh')
        self.assertTrue(Driver.objects.filter(user=user, license_no='LIC-PROFILE-01').exists())
        self.assertTrue(UserRole.objects.filter(user=user, role__role_name='driver').exists())

    def test_register_rejects_duplicate_license(self):
        Driver.objects.filter(user=self.user).update(license_no='LIC-DUP-99')
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Dup Lic',
            'email': 'dup@camtraffic.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
            'license_no': 'LIC-DUP-99',
        })
        self.assertEqual(res.status_code, 400)

    def test_register_rejects_duplicate_email(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'Dup Email',
            'email': self.user.email,
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('already exists', res.data['message'].lower())
        self.assertIn('email', res.data['errors'])

    def test_register_without_license_no(self):
        res = self.client.post('/api/auth/register/', {
            'full_name': 'No License',
            'email': 'nolic@camtraffic.kh',
            'password': 'Strong@99',
            'password_confirm': 'Strong@99',
            'address': 'Phnom Penh',
        })
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nolic@camtraffic.kh')
        self.assertTrue(Driver.objects.filter(user=user).exists())
        self.assertTrue(user.license_no)

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

    def test_profile_overview_returns_preferences_and_activity(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
            'portal': 'user',
            'role': 'driver',
        })
        token = login.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/auth/profile/overview/')
        self.assertEqual(res.status_code, 200)
        payload = res.data['data']
        self.assertIn('preferences', payload)
        self.assertIn('activity', payload)
        self.assertIn('sessions', payload)
        self.assertIn('login_history', payload)
        self.assertTrue(payload['login_history'])

    def test_profile_preferences_patch(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
        })
        token = login.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.patch('/api/auth/profile/preferences/', {'notify_system': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['data']['notify_system'])

    def test_profile_update_via_auth_profile(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'test@camtraffic.kh',
            'password': self.password,
        })
        token = login.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.patch('/api/auth/profile/', {'phone': '+85512345678'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['data']['phone'], '+85512345678')


class UserManagementAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email='admin-delete@test.kh',
            full_name='Delete Admin',
            role='admin',
            is_active=True,
        )
        self.admin.set_password('Admin@12345')
        self.admin.save()
        self.target = User.objects.create(
            email='target-delete@test.kh',
            full_name='Delete Target',
            role='driver',
            is_active=True,
        )
        self.target.set_password('Test@12345')
        self.target.save()
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_delete_user_by_uuid(self):
        res = self.client.delete(f'/api/users/{self.target.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))
        self.assertFalse(User.objects.filter(pk=self.target.pk).exists())


class InfrastructureAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Test@12345'
        self.admin = User.objects.create_user(
            email='admin@camtraffic.kh',
            password=self.password,
            full_name='Admin User',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='driver2@camtraffic.kh',
            password=self.password,
            full_name='Driver Two',
            role='driver',
        )
        login = self.client.post('/api/auth/login/', {
            'email': 'admin@camtraffic.kh',
            'password': self.password,
            'portal': 'admin',
        })
        self.token = login.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_road_crud(self):
        create = self.client.post('/api/roads/', {
            'name': 'Monivong Blvd',
            'road_type': 'urban',
            'city': 'Phnom Penh',
            'speed_limit': 50,
            'status': 'active',
        }, format='json')
        self.assertEqual(create.status_code, 201)
        road_id = create.data['data']['id']

        detail = self.client.get(f'/api/roads/{road_id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['data']['name'], 'Monivong Blvd')

        patch = self.client.patch(f'/api/roads/{road_id}/', {'speed_limit': 40}, format='json')
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.data['data']['speed_limit'], 40)

    def test_camera_crud(self):
        road = self.client.post('/api/roads/', {
            'name': 'Test Road',
            'road_type': 'intersection',
            'city': 'Phnom Penh',
        }, format='json').data['data']

        cam = self.client.post('/api/cameras/', {
            'road': road['id'],
            'name': 'Cam-01',
            'code': 'CAM-TEST-01',
            'camera_type': 'fixed',
            'status': 'active',
            'frame_source_url': 'https://example.com/snapshot.jpg',
        }, format='json')
        self.assertEqual(cam.status_code, 201)
        cam_id = cam.data['data']['id']
        self.assertEqual(cam.data['data']['road_name'], 'Test Road')

        listed = self.client.get('/api/cameras/')
        self.assertEqual(listed.status_code, 200)
        self.assertGreaterEqual(len(listed.data['data']), 1)

        deleted = self.client.delete(f'/api/cameras/{cam_id}/')
        self.assertEqual(deleted.status_code, 200)

    def test_infrastructure_admin_only(self):
        self.client.credentials()
        driver_login = self.client.post('/api/auth/login/', {
            'email': 'driver2@camtraffic.kh',
            'password': self.password,
            'portal': 'user',
            'role': 'driver',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {driver_login.data['data']['access']}")
        res = self.client.get('/api/roads/')
        self.assertEqual(res.status_code, 403)
