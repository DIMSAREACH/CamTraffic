"""Tests for auto evidence snapshot capture."""
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
from django.test import SimpleTestCase, TestCase, override_settings

from ai_detection.evidence_capture import capture_evidence_snapshots


class EvidenceCaptureUnitTest(SimpleTestCase):
    def test_capture_returns_plate_crop_for_full_frame_read(self):
        sample = Path(__file__).resolve().parents[2] / 'ai' / 'test_samples' / 'plate_2A-1234.png'
        if not sample.is_file():
            self.skipTest('plate sample image missing')

        plate_result = {
            'plate_text': '2A-1234',
            'best_region': 'full_frame',
            'plate_regions': ['full_frame'],
        }
        out = capture_evidence_snapshots(str(sample), [], plate_result)
        self.assertTrue(out['captured'])
        self.assertIsNotNone(out['plate_snapshot'])
        self.assertEqual(out['plate_region'], 'full_frame')

    def test_vehicle_crop_from_bbox(self):
        img = np.zeros((200, 300, 3), dtype=np.uint8)
        cv2.rectangle(img, (30, 40), (220, 160), (255, 255, 255), -1)
        path = Path(__file__).parent / '_tmp_evidence_vehicle.jpg'
        cv2.imwrite(str(path), img)
        try:
            vehicles = [{
                'vehicle_type': 'car',
                'label': 'Car',
                'confidence': 90.0,
                'bbox': {'x1': 0.1, 'y1': 0.2, 'x2': 0.75, 'y2': 0.8},
            }]
            out = capture_evidence_snapshots(str(path), vehicles, {})
            self.assertTrue(out['captured'])
            self.assertIsNotNone(out['vehicle_snapshot'])
            self.assertEqual(out['vehicle_region'], 'vehicle_bbox')
        finally:
            if path.exists():
                path.unlink()


class EvidenceCaptureIntegrationTest(TestCase):
    @override_settings(AI_PIPELINE_DEMO_VIOLATION=True, AI_PIPELINE_AUTO_CREATE_VIOLATION=True)
    def test_violation_record_receives_plate_evidence(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIRequestFactory

        from ai_detection.models import AIDetectionLog
        from ai_detection.pipeline_enforcement import apply_pipeline_enforcement
        from users.models import Driver
        from vehicles.models import Vehicle
        from violations.models import TrafficViolation
        from violations.services import seed_default_rules

        seed_default_rules()
        User = get_user_model()
        admin = User.objects.create_user(
            email='evidence-admin@camtraffic.kh',
            password='Test@12345',
            full_name='Evidence Admin',
            role='admin',
        )
        driver_user = User.objects.create_user(
            email='evidence-driver@camtraffic.kh',
            password='Test@12345',
            full_name='Evidence Driver',
            role='driver',
            license_no='LIC-EV-01',
        )
        driver, _ = Driver.objects.get_or_create(
            user=driver_user,
            defaults={'license_no': 'LIC-EV-01'},
        )
        vehicle = Vehicle.objects.create(
            owner=driver_user,
            driver=driver,
            plate_number='2A-1234',
            vehicle_type='car',
            model='Camry',
            color='White',
            year=2021,
        )

        sample = Path(__file__).resolve().parents[2] / 'ai' / 'test_samples' / 'plate_2A-1234.png'
        if not sample.is_file():
            self.skipTest('plate sample image missing')

        evidence = capture_evidence_snapshots(str(sample), [], {'best_region': 'full_frame'})
        log = AIDetectionLog.objects.create(
            user=admin,
            detected_sign='No Left Turn',
            confidence=90.0,
            description='',
            guidance='',
            processing_time=1.0,
            plate_snapshot=evidence.get('plate_snapshot'),
        )

        factory = APIRequestFactory()
        request = factory.post('/api/ai/detect/', {'auto_create_violation': 'true'})
        request.user = admin

        out = apply_pipeline_enforcement(
            request=request,
            sign_result={'class_key': 'NO_LEFT_TURN', 'sign_code': ''},
            plate_result={
                'matched_vehicle': {'id': vehicle.id, 'plate_number': '2A-1234'},
            },
            vehicles=[],
            log=log,
            payload={},
        )

        self.assertIn('violation', out)
        violation = TrafficViolation.objects.get(pk=out['violation']['id'])
        self.assertTrue(violation.plate_evidence_image)
