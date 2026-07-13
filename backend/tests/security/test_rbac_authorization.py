"""RBAC authorization API tests (Phase 12 — Task 326)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from rbac.models import Permission, Role, RolePermission, UserRole
from rbac.permissions import user_has_rbac_permission, user_has_rbac_role

User = get_user_model()


class RBACAuthorizationTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='rbac-admin@test.kh',
            password='Admin@12345',
            full_name='RBAC Admin',
            role='admin',
        )
        self.driver = User.objects.create_user(
            email='rbac-driver@test.kh',
            password='Driver@12345',
            full_name='RBAC Driver',
            role='driver',
        )
        role, _ = Role.objects.get_or_create(role_name='driver', defaults={'status': 'active'})
        permission, _ = Permission.objects.get_or_create(
            perm_name='fines.view',
            defaults={'action_type': 'view', 'resource': 'fines'},
        )
        RolePermission.objects.get_or_create(role=role, permission=permission)
        UserRole.objects.update_or_create(user=self.driver, defaults={'role': role})

    def test_admin_bypasses_fine_permission_check(self):
        self.assertTrue(user_has_rbac_permission(self.admin, 'fines.view'))
        self.assertTrue(user_has_rbac_permission(self.admin, 'users.delete'))

    def test_driver_has_assigned_permission_only(self):
        self.assertTrue(user_has_rbac_role(self.driver, 'driver'))
        self.assertTrue(user_has_rbac_permission(self.driver, 'fines.view'))
        self.assertFalse(user_has_rbac_permission(self.driver, 'users.delete'))

    def test_rbac_roles_endpoint_admin_only(self):
        self.client.force_authenticate(user=self.driver)
        denied = self.client.get('/api/rbac/roles/')
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        allowed = self.client.get('/api/rbac/roles/')
        self.assertEqual(allowed.status_code, 200)
