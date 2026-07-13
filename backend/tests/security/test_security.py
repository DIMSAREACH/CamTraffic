"""Security middleware, headers, rate limiting, and RBAC permission tests."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from rbac.models import Permission, Role, RolePermission, UserRole
from rbac.permissions import HasRBACPermission, HasRBACRole, user_has_rbac_permission, user_has_rbac_role

User = get_user_model()


@override_settings(
    LOGIN_RATE_LIMIT_MAX=3,
    LOGIN_RATE_LIMIT_WINDOW=300,
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    },
)
class SecurityMiddlewareTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.password = 'Test@12345'
        self.user = User.objects.create_user(
            email='sec@camtraffic.kh',
            password=self.password,
            full_name='Security Test',
            role='driver',
        )

    def test_security_headers_on_health(self):
        res = self.client.get('/health/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(res['Referrer-Policy'], 'strict-origin-when-cross-origin')
        self.assertIn('camera=()', res['Permissions-Policy'])
        self.assertIn('X-Request-ID', res)

    def test_login_rate_limit_returns_429(self):
        for _ in range(3):
            res = self.client.post('/api/auth/login/', {
                'email': 'sec@camtraffic.kh',
                'password': 'wrong-password',
            })
            self.assertIn(res.status_code, (401, 403))

        blocked = self.client.post('/api/auth/login/', {
            'email': 'sec@camtraffic.kh',
            'password': 'wrong-password',
        })
        self.assertEqual(blocked.status_code, 429)

    def test_successful_login_clears_rate_limit(self):
        for _ in range(2):
            self.client.post('/api/auth/login/', {
                'email': 'sec@camtraffic.kh',
                'password': 'wrong-password',
            })
        ok = self.client.post('/api/auth/login/', {
            'email': 'sec@camtraffic.kh',
            'password': self.password,
        })
        self.assertEqual(ok.status_code, 200)
        retry = self.client.post('/api/auth/login/', {
            'email': 'sec@camtraffic.kh',
            'password': 'wrong-password',
        })
        self.assertEqual(retry.status_code, 401)


class RBACPermissionFactoryTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@camtraffic.kh',
            password='Admin@12345',
            full_name='Admin User',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='driver@camtraffic.kh',
            password='Driver@12345',
            full_name='Driver User',
            role='driver',
        )
        self.role, _ = Role.objects.get_or_create(role_name='driver', defaults={'status': 'active'})
        self.permission, _ = Permission.objects.get_or_create(
            perm_name='fines.view',
            defaults={'action_type': 'view', 'resource': 'fines'},
        )
        RolePermission.objects.get_or_create(role=self.role, permission=self.permission)
        UserRole.objects.update_or_create(user=self.driver, defaults={'role': self.role})

    def test_legacy_role_check(self):
        self.assertTrue(user_has_rbac_role(self.admin, 'admin'))
        self.assertTrue(user_has_rbac_role(self.driver, 'driver'))

    def test_assigned_role_permission(self):
        self.assertTrue(user_has_rbac_permission(self.driver, 'fines.view'))
        self.assertFalse(user_has_rbac_permission(self.driver, 'users.delete'))

    def test_admin_bypasses_permission(self):
        self.assertTrue(user_has_rbac_permission(self.admin, 'any.permission'))

    def test_factory_classes(self):
        role_perm = HasRBACRole('driver')()
        fine_perm = HasRBACPermission('fines.view')()

        class DummyView:
            pass

        request = type('Req', (), {'user': self.driver})()
        self.assertTrue(role_perm.has_permission(request, DummyView))
        self.assertTrue(fine_perm.has_permission(request, DummyView))


class RBACAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='rbac-admin@camtraffic.kh',
            password='Admin@12345',
            full_name='RBAC Admin',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='rbac-driver@camtraffic.kh',
            password='Driver@12345',
            full_name='RBAC Driver',
            role='driver',
        )

    def test_rbac_roles_requires_admin(self):
        self.client.force_authenticate(user=self.driver)
        res = self.client.get('/api/rbac/roles/')
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/rbac/roles/')
        self.assertEqual(res.status_code, 200)
