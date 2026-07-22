"""Unit tests for the User model (Phase 12 — Task 316)."""
from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserModelTest(TestCase):
    def test_create_user_with_email_and_role(self):
        user = User.objects.create_user(
            email='unit@test.kh',
            password='Test@12345',
            full_name='Unit Test User',
            role='driver',
        )
        self.assertEqual(user.email, 'unit@test.kh')
        self.assertEqual(user.role, 'driver')
        self.assertTrue(user.check_password('Test@12345'))
        self.assertTrue(user.is_active)

    def test_user_str_includes_name_and_role(self):
        user = User.objects.create_user(
            email='str@test.kh',
            password='Test@12345',
            full_name='Str User',
            role='police',
        )
        self.assertIn('Str User', str(user))
        self.assertIn('police', str(user))

    def test_display_name_falls_back_to_email(self):
        user = User.objects.create_user(
            email='display@test.kh',
            password='Test@12345',
            full_name='',
            role='admin',
        )
        self.assertEqual(user.display_name, 'display@test.kh')
