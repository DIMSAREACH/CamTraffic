"""Notification flow integration tests (Phase 11 — Tasks 300, 311)."""
from decimal import Decimal

from django.test import TestCase, override_settings

from notifications.models import Notification
from violations.models import ViolationRule
from violations.services import create_violation_record, evaluate_violation


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class NotificationFlowTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.driver_user = User.objects.create_user(
            email='notif_driver@test.kh',
            password='testpass123',
            full_name='Notif Driver',
            role='driver',
            license_no='NOTIF-001',
        )
        self.driver = self.driver_user.driver_profile
        self.driver.status = 'active'
        self.driver.save(update_fields=['status'])
        self.admin = User.objects.create_user(
            email='notif_admin@test.kh',
            password='testpass123',
            full_name='Notif Admin',
            role='admin',
            is_staff=True,
        )
        ViolationRule.objects.get_or_create(
            sign_class_key='NO_LEFT_TURN',
            prohibited_action='LEFT_TURN',
            defaults={
                'violation_type': 'ILLEGAL_LEFT_TURN',
                'title': 'Illegal Left Turn',
                'default_fine_amount': Decimal('25.00'),
            },
        )

    def test_dispatch_notification_creates_row(self):
        from notifications.services import dispatch_notification

        before = Notification.objects.filter(user=self.admin).count()
        dispatch_notification(self.admin, 'Test', 'Hello', 'system', async_dispatch=True)
        after = Notification.objects.filter(user=self.admin).count()
        self.assertEqual(after, before + 1)

    def test_violation_notifies_driver(self):
        from notifications.services import notify_driver_violation

        evaluation = evaluate_violation(class_key='NO_LEFT_TURN', observed_action='LEFT_TURN')
        self.assertTrue(evaluation.get('is_violation'))
        violation = create_violation_record(
            driver=self.driver,
            evaluation=evaluation,
            location='Test Rd',
        )
        before = Notification.objects.filter(user=self.driver_user).count()
        notify_driver_violation(self.driver, violation)
        after = Notification.objects.filter(user=self.driver_user).count()
        self.assertEqual(after, before + 1)
        latest = Notification.objects.filter(user=self.driver_user).order_by('-created_at').first()
        self.assertEqual(latest.type, 'violation')

    def test_fine_issue_notifies_driver_via_api(self):
        from fines.models import Fine

        from notifications.services import notify_driver_fine

        before = Notification.objects.filter(user=self.driver_user).count()
        fine = Fine.objects.create(
            driver=self.driver_user,
            police=self.admin,
            amount=Decimal('15.00'),
            reason='Speeding',
            location='NR1',
        )
        notify_driver_fine(self.driver_user, fine)
        after = Notification.objects.filter(user=self.driver_user).count()
        self.assertEqual(after, before + 1)

    def test_validate_integration_script_exists(self):
        from pathlib import Path

        script = Path(__file__).resolve().parent.parent / 'scripts' / 'validate_integration.py'
        self.assertTrue(script.is_file())
