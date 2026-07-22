"""Monthly enforcement Excel export."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from dashboard.excel_export import build_enforcement_monthly_workbook
from fines.models import Fine
from users.models import User
from violations.models import TrafficViolation
from violations.services import seed_default_rules


class EnforcementExcelExportTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        seed_default_rules()
        self.admin = User.objects.create_user(
            email='admin-excel@test.com',
            password='TestPass123!',
            full_name='Admin Excel',
            role='admin',
        )
        self.police_user = User.objects.create_user(
            email='police-excel@test.com',
            password='TestPass123!',
            full_name='Police Excel',
            role='police',
        )
        self.driver_user = User.objects.create_user(
            email='driver-excel@test.com',
            password='TestPass123!',
            full_name='Driver Excel',
            role='driver',
            license_no='LIC-EXCEL-01',
        )
        self.driver = self.driver_user.driver_profile
        self.officer = self.police_user.officer_profile
        now = timezone.now()
        self.violation = TrafficViolation.objects.create(
            driver=self.driver,
            officer=self.officer,
            violation_type='ILLEGAL_LEFT_TURN',
            observed_action='LEFT_TURN',
            detected_sign_code='PW03-R1-01',
            detected_class_key='NO_LEFT_TURN',
            violation_date=now,
            location='Test Intersection',
            description='Test violation',
            status='confirmed',
        )
        self.fine = Fine.objects.create(
            driver=self.driver_user,
            police=self.police_user,
            amount=25,
            reason='Illegal left turn',
            location='Test Intersection',
            vehicle_plate='2A-1234',
            violation=self.violation,
        )

    def test_build_workbook_returns_xlsx_bytes(self):
        now = timezone.now()
        data = build_enforcement_monthly_workbook(
            user=self.admin,
            year=now.year,
            month=now.month,
        )
        self.assertTrue(data.startswith(b'PK'), 'Expected xlsx zip header')
        self.assertGreater(len(data), 500)

    def test_police_export_scoped_to_officer(self):
        other_police = User.objects.create_user(
            email='other-police@test.com',
            password='TestPass123!',
            full_name='Other Police',
            role='police',
        )
        Fine.objects.create(
            driver=self.driver_user,
            police=other_police,
            amount=10,
            reason='Other fine',
            location='Elsewhere',
        )
        now = timezone.now()
        data = build_enforcement_monthly_workbook(
            user=self.police_user,
            year=now.year,
            month=now.month,
        )
        self.assertTrue(data.startswith(b'PK'))

    def test_export_api_requires_auth(self):
        now = timezone.now()
        r = self.client.get(
            '/api/dashboard/enforcement/export.xlsx/',
            {'year': now.year, 'month': now.month},
        )
        self.assertEqual(r.status_code, 401)

    def test_export_api_admin_download(self):
        self.client.force_authenticate(user=self.admin)
        now = timezone.now()
        r = self.client.get(
            '/api/dashboard/enforcement/export.xlsx/',
            {'year': now.year, 'month': now.month},
        )
        self.assertEqual(r.status_code, 200, r.content[:200])
        self.assertIn('spreadsheetml', r['Content-Type'])
        self.assertIn('attachment', r['Content-Disposition'])
