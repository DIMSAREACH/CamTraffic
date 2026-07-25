"""Tests for full detection pipeline enforcement (violation + evidence)."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory

from ai_detection.models import AIDetectionLog
from ai_detection.pipeline_enforcement import (
    apply_pipeline_enforcement,
    infer_demo_observed_action,
    resolve_driver,
)
from users.models import Driver
from vehicles.models import Vehicle
from violations.models import TrafficViolation, ViolationRule
from violations.services import seed_default_rules

User = get_user_model()


class PipelineEnforcementTest(TestCase):
    def setUp(self):
        seed_default_rules()
        self.password = 'Test@12345'
        self.admin = User.objects.create_user(
            email='pipeline-admin@camtraffic.kh',
            password=self.password,
            full_name='Pipeline Admin',
            role='admin',
        )
        self.driver_user = User.objects.create_user(
            email='pipeline-driver@camtraffic.kh',
            password=self.password,
            full_name='Pipeline Driver',
            role='driver',
            license_no='LIC-PIPE-01',
        )
        self.driver, _ = Driver.objects.get_or_create(
            user=self.driver_user,
            defaults={'license_no': 'LIC-PIPE-01'},
        )
        self.vehicle = Vehicle.objects.create(
            owner=self.driver_user,
            driver=self.driver,
            plate_number='2A-1234',
            vehicle_type='car',
            model='Toyota Camry',
            color='White',
            year=2022,
        )
        self.factory = APIRequestFactory()

    def test_infer_demo_observed_action_for_no_left_turn(self):
        self.assertEqual(infer_demo_observed_action('NO_LEFT_TURN'), 'LEFT_TURN')

    def test_resolve_driver_from_matched_plate(self):
        driver = resolve_driver(plate_result={
            'matched_vehicle': {'id': self.vehicle.id, 'plate_number': '2A-1234'},
        })
        self.assertEqual(driver.id, self.driver.id)

    @override_settings(AI_PIPELINE_DEMO_VIOLATION=True, AI_PIPELINE_AUTO_CREATE_VIOLATION=True)
    def test_apply_pipeline_enforcement_creates_violation(self):
        log = AIDetectionLog.objects.create(
            user=self.admin,
            detected_sign='No Left Turn',
            confidence=92.0,
            description='Demo',
            guidance='Do not turn left',
            processing_time=1.2,
        )
        request = self.factory.post('/api/ai/detect/', {'auto_create_violation': 'true'})
        request.user = self.admin

        out = apply_pipeline_enforcement(
            request=request,
            sign_result={
                'class_key': 'NO_LEFT_TURN',
                'sign_code': 'PW03-R1-01',
            },
            plate_result={
                'plate_text': '2A-1234',
                'matched_vehicle': {
                    'id': self.vehicle.id,
                    'plate_number': '2A-1234',
                    'owner_name': self.driver_user.full_name,
                    'vehicle_type': 'car',
                },
            },
            vehicles=[],
            log=log,
            payload={},
        )

        self.assertTrue(out['violation_evaluation']['is_violation'])
        self.assertEqual(out['violation_evaluation']['violation_type'], 'ILLEGAL_LEFT_TURN')
        self.assertIn('violation', out)
        self.assertEqual(TrafficViolation.objects.count(), 1)
        violation = TrafficViolation.objects.first()
        self.assertEqual(violation.driver_id, self.driver.id)
        self.assertEqual(violation.vehicle_id, self.vehicle.id)
        self.assertEqual(violation.ai_detection_log_id, log.id)
        self.assertEqual(violation.detected_class_key, 'NO_LEFT_TURN')

    @override_settings(AI_PIPELINE_DEMO_VIOLATION=True, AI_PIPELINE_AUTO_CREATE_VIOLATION=True)
    def test_no_violation_when_demo_action_does_not_match_rule(self):
        log = AIDetectionLog.objects.create(
            user=self.admin,
            detected_sign='No Left Turn',
            confidence=92.0,
            description='Demo',
            guidance='',
            processing_time=1.0,
        )
        request = self.factory.post(
            '/api/ai/detect/',
            {'observed_action': 'RIGHT_TURN', 'auto_create_violation': 'true'},
        )
        request.user = self.admin

        out = apply_pipeline_enforcement(
            request=request,
            sign_result={'class_key': 'NO_LEFT_TURN', 'sign_code': ''},
            plate_result={'matched_vehicle': {'id': self.vehicle.id}},
            vehicles=[],
            log=log,
            payload={},
        )

        self.assertEqual(out['violation_evaluation']['is_violation'], False)
        self.assertEqual(TrafficViolation.objects.count(), 0)
