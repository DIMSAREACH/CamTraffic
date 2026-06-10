"""Fast-path pipeline behavior for live webcam captures."""
from unittest.mock import patch

from django.test import SimpleTestCase

from ai_detection.pipeline import run_detection_pipeline


class PipelineSpeedTest(SimpleTestCase):
    @patch('ai_detection.pipeline.detect_traffic_sign')
    @patch('ai_detection.pipeline.recognize_plate')
    @patch('ai_detection.pipeline.detect_vehicles')
    def test_live_capture_skips_vehicle_and_plate(self, mock_vehicles, mock_plate, mock_sign):
        mock_sign.return_value = {
            'sign_name': 'No Entry',
            'confidence': 23.8,
            'description': 'Test',
            'guidance': 'Test',
            'class_key': 'no_entry',
            'detection_engine': 'yolo',
        }

        run_detection_pipeline('/tmp/frame.jpg', original_filename='webcam-1234567890.jpg')

        mock_vehicles.assert_not_called()
        mock_plate.assert_not_called()
        mock_sign.assert_called_once()

    @patch('ai_detection.pipeline.detect_traffic_sign')
    @patch('ai_detection.pipeline.recognize_plate')
    @patch('ai_detection.pipeline.detect_vehicles')
    @patch('ai_detection.pipeline.vehicle_detection_enabled', return_value=True)
    def test_upload_runs_full_pipeline(self, _enabled, mock_vehicles, mock_plate, mock_sign):
        mock_vehicles.return_value = []
        mock_plate.return_value = {'plate_text': '', 'plate_confidence': 0.0, 'plate_type': ''}
        mock_sign.return_value = {
            'sign_name': 'No Entry',
            'confidence': 88.0,
            'description': 'Test',
            'guidance': 'Test',
            'class_key': 'no_entry',
        }

        run_detection_pipeline('/tmp/sign.jpg', original_filename='NO_ENTRY_sample.jpg')

        mock_vehicles.assert_called_once()
        mock_plate.assert_called_once()
        mock_sign.assert_called_once()
