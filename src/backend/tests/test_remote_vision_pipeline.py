"""Tests for Django → ai-vision-service proxy pipeline."""

import tempfile
from unittest.mock import patch

from django.test import TestCase, override_settings

from ai_detection.pipeline import run_detection_pipeline
from ai_detection.remote_pipeline import map_remote_envelope_to_pipeline


REMOTE_ENVELOPE = {
    'success': True,
    'message': 'Detection complete',
    'data': {
        'detection_id': '11111111-1111-1111-1111-111111111111',
        'processing_ms': 120,
        'model_version': 'mock/1.0.0',
        'mock_mode': True,
        'signs': [
            {
                'class': 'no_entry',
                'confidence': 0.92,
                'bbox': [120, 80, 200, 160],
                'sign_code': 'R-001',
            }
        ],
        'vehicles': [
            {
                'class': 'car',
                'confidence': 0.94,
                'bbox': [300, 200, 500, 400],
            }
        ],
        'plates': [
            {
                'text': '2A-1234',
                'confidence': 0.88,
                'bbox': [350, 380, 420, 400],
                'format_valid': True,
            }
        ],
        'behaviors': [],
        'violation_suggestions': [],
    },
}


@override_settings(
    AI_VISION_SERVICE_URL='http://localhost:8080',
    AI_USE_MOCK=True,
)
class RemoteVisionPipelineTest(TestCase):
    def test_map_remote_envelope_builds_pipeline_shape(self):
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(b'\xff\xd8\xff\xd9')
            image_path = tmp.name

        result = map_remote_envelope_to_pipeline(
            REMOTE_ENVELOPE,
            image_path=image_path,
        )
        self.assertIn('sign_result', result)
        self.assertIn('payload', result)
        self.assertEqual(result['plate_result']['plate_text'], '2A-1234')
        self.assertTrue(result['payload'].get('remote_detection'))
        self.assertGreater(result['sign_result']['confidence'], 0)

    @patch('ai_detection.remote_pipeline.detect_via_vision_service')
    def test_run_detection_pipeline_uses_remote_service(self, mock_detect):
        mock_detect.return_value = REMOTE_ENVELOPE
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(b'\xff\xd8\xff\xd9')
            image_path = tmp.name

        result = run_detection_pipeline(image_path)
        mock_detect.assert_called_once_with(image_path)
        self.assertTrue(result['payload'].get('remote_detection'))
        self.assertIn('ai-vision-service', result['sign_result']['detection_engine'])

    @patch('ai_detection.remote_pipeline.detect_via_vision_service')
    @patch('ai_detection.pipeline.detect_traffic_sign')
    def test_run_detection_pipeline_falls_back_on_remote_error(self, mock_local_sign, mock_detect):
        mock_detect.side_effect = RuntimeError('service down')
        mock_local_sign.return_value = {
            'sign_name': 'Stop Sign',
            'sign_name_en': 'Stop Sign',
            'sign_name_km': 'ឈប់',
            'confidence': 80.0,
            'description': 'Stop',
            'guidance': 'Stop completely',
            'detection_engine': 'mock',
            'processing_time': 0.1,
        }

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(b'\xff\xd8\xff\xd9')
            image_path = tmp.name

        result = run_detection_pipeline(image_path, sign_only=True)
        mock_detect.assert_called_once()
        mock_local_sign.assert_called_once()
        self.assertFalse(result['payload'].get('remote_detection'))
