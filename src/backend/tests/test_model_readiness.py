"""Tests for AI model readiness diagnostics."""
from pathlib import Path
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from ai_detection.model_readiness import build_model_readiness, sign_model_path


class ModelReadinessTests(SimpleTestCase):
    @override_settings(
        AI_USE_MOCK=False,
        AI_ROOT=Path(__file__).resolve().parents[3] / 'ai',
        AI_MODEL_PATH=str(Path(__file__).resolve().parents[3] / 'ai' / 'weights' / 'best.pt'),
        AI_VEHICLE_ENABLED=True,
        AI_VEHICLE_MODEL='best_cambodia_vehicles.pt',
        AI_PLATE_DETECT_ENABLED=True,
        AI_PLATE_DETECT_MODEL='best_cambodia_plates.pt',
        AI_HELMET_ENABLED=True,
        AI_HELMET_MODEL='best_cambodia_helmet.pt',
    )
    def test_build_readiness_reports_components(self):
        payload = build_model_readiness(warm=False)
        self.assertIn('components', payload)
        self.assertIn('sign', payload['components'])
        self.assertIn('vehicle', payload['components'])
        self.assertIn('plate', payload['components'])
        self.assertIn('helmet', payload['components'])
        self.assertIsInstance(payload['advice'], list)
        # If local weights exist, models_on_disk should be true.
        sign_path = sign_model_path()
        if sign_path.is_file():
            self.assertTrue(payload['models_on_disk'])
            self.assertTrue(payload['ready'])
            self.assertEqual(payload['components']['sign']['status'], 'ready')

    @override_settings(AI_USE_MOCK=True)
    def test_mock_mode_not_ready_for_real_detection(self):
        payload = build_model_readiness(warm=False)
        self.assertTrue(payload['use_mock'])
        self.assertFalse(payload['ready'])
        self.assertTrue(any('AI_USE_MOCK' in a for a in payload['advice']))

    @override_settings(
        AI_USE_MOCK=False,
        AI_MODEL_PATH=r'D:\missing\does-not-exist.pt',
        AI_ROOT=Path(__file__).resolve().parents[3] / 'ai',
    )
    def test_missing_sign_weights_advice(self):
        with patch('ai_detection.model_readiness.sign_model_path', return_value=Path(r'D:\missing\does-not-exist.pt')):
            payload = build_model_readiness(warm=False)
        self.assertFalse(payload['ready'])
        self.assertIn('sign', payload['missing_required'])
