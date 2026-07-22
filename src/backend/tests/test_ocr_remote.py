"""Tests for Django → ocr-service integration."""

import tempfile
from unittest.mock import patch

from django.test import TestCase, override_settings

from ai_detection.ocr_remote_client import map_remote_ocr_to_plate_result
from ai_detection.plate_ocr import recognize_plate


REMOTE_OCR_DATA = {
    'plate_text': '2A-1234',
    'plate_confidence': 0.88,
    'plate_type': 'private',
    'format_valid': True,
    'ocr_engine': 'ocr-service',
    'raw_reads': [{'text': '2A-1234', 'confidence': 88.0, 'region': 'mock'}],
    'plate_regions': ['mock'],
    'plate_region_found': True,
    'plate_province_code': '2',
    'plate_province_en': 'Battambang',
    'plate_province_km': 'បាត់ដំបង',
}


@override_settings(OCR_SERVICE_URL='http://localhost:8081', AI_PLATE_OCR_ENABLED=True)
class OcrRemoteClientTest(TestCase):
    def test_map_remote_scales_confidence_to_percent(self):
        result = map_remote_ocr_to_plate_result(REMOTE_OCR_DATA)
        self.assertEqual(result['plate_text'], '2A-1234')
        self.assertEqual(result['plate_confidence'], 88.0)

    @patch('ai_detection.ocr_remote_client.read_plate_via_ocr_service')
    def test_recognize_plate_uses_remote_service(self, mock_read):
        mock_read.return_value = REMOTE_OCR_DATA
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(b'\xff\xd8\xff\xd9')
            image_path = tmp.name

        result = recognize_plate(image_path, vehicles=[])
        mock_read.assert_called_once()
        self.assertEqual(result['plate_text'], '2A-1234')
        self.assertEqual(result['ocr_engine'], 'ocr-service')

    @patch('ai_detection.ocr_remote_client.read_plate_via_ocr_service')
    @patch('ai_detection.plate_ocr.cv2.imread')
    def test_recognize_plate_falls_back_on_remote_error(self, mock_imread, mock_read):
        mock_read.side_effect = RuntimeError('down')
        mock_imread.return_value = None
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(b'\xff\xd8\xff\xd9')
            image_path = tmp.name

        result = recognize_plate(image_path, vehicles=[])
        mock_read.assert_called_once()
        self.assertEqual(result['plate_text'], '')
