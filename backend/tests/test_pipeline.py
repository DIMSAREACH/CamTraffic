from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from ai_detection.pipeline import build_pipeline_steps, run_detection_pipeline


class PipelineTest(SimpleTestCase):
    @patch('ai_detection.pipeline.detect_traffic_sign')
    @patch('ai_detection.pipeline.recognize_plate')
    @patch('ai_detection.pipeline.detect_vehicles')
    @override_settings(AI_VEHICLE_ENABLED=True, AI_PLATE_OCR_ENABLED=True)
    def test_pipeline_order_vehicle_then_plate(self, mock_vehicles, mock_plate, mock_sign):
        mock_vehicles.return_value = [{
            'vehicle_type': 'car',
            'label': 'Car',
            'confidence': 88.0,
            'bbox': {'x1': 0, 'y1': 0, 'x2': 1, 'y2': 1},
        }]
        mock_plate.return_value = {
            'plate_text': '2A-1234',
            'plate_confidence': 97.0,
            'plate_type': 'private',
            'plate_regions': ['full_frame'],
            'raw_reads': [],
        }
        mock_sign.return_value = {
            'sign_name': 'ស្លាកមិនស្គាល់',
            'sign_name_en': 'Unknown sign',
            'confidence': 0.0,
            'description': '',
            'guidance': '',
            'class_key': '',
            'detection_engine': 'yolo',
        }

        out = run_detection_pipeline('/tmp/test.jpg')
        mock_vehicles.assert_called_once()
        mock_plate.assert_called_once()
        self.assertEqual(out['payload']['detected_plate'], '2A-1234')
        self.assertEqual(out['payload']['detection_mode'], 'vehicle')

        steps = build_pipeline_steps(
            vehicles=out['vehicles'],
            plate_result=out['plate_result'],
            vehicle_summary=out['vehicle_summary'],
            log_id=42,
        )
        self.assertEqual([s['id'] for s in steps], [
            'upload', 'vehicle_detect', 'plate_detect', 'plate_ocr',
            'show_vehicle', 'show_plate', 'violation_check', 'evidence_capture', 'save_record',
        ])
        self.assertEqual(steps[-1]['status'], 'complete')
        self.assertIn('42', steps[-1]['detail_en'])
