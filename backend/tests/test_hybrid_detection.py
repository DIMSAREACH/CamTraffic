"""Tests for YOLO + Gemini hybrid detection."""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from ai_detection.services import _run_hybrid_detection


class HybridDetectionTest(SimpleTestCase):
    @override_settings(
        AI_HYBRID_CONFIDENCE_THRESHOLD=70,
        AI_MIN_RESULT_CONFIDENCE=45,
        GEMINI_API_KEY='test-key',
        GEMINI_ENABLED=True,
    )
    @patch('ai_detection.services._yolo_raw_detect')
    @patch('ai_detection.gemini_service.detect_sign_with_gemini')
    def test_uses_yolo_when_confidence_above_threshold(self, mock_gemini, mock_yolo):
        mock_yolo.return_value = {'class_key': 'no_left_turn', 'confidence': 88.0}
        mock_gemini.return_value = None

        result, engine = _run_hybrid_detection('/tmp/sign.jpg', 'webcam-123.jpg')

        self.assertEqual(engine, 'yolo')
        self.assertEqual(result['detection_engine'], 'yolo')
        self.assertGreaterEqual(result['confidence'], 70)
        mock_gemini.assert_not_called()

    @override_settings(
        AI_HYBRID_CONFIDENCE_THRESHOLD=70,
        AI_MIN_RESULT_CONFIDENCE=45,
        GEMINI_API_KEY='test-key',
        GEMINI_ENABLED=True,
    )
    @patch('ai_detection.services._yolo_raw_detect')
    @patch('ai_detection.gemini_service.detect_sign_with_gemini')
    def test_falls_back_to_gemini_when_yolo_low(self, mock_gemini, mock_yolo):
        mock_yolo.return_value = {'class_key': 'no_left_turn', 'confidence': 42.0}
        mock_gemini.return_value = {
            'sign_name': 'ហាមបត់ឆ្វេង',
            'sign_name_en': 'No Left Turn',
            'sign_code': 'PW03-R1-01',
            'class_key': 'NO_LEFT_TURN',
            'description': 'Test',
            'guidance': 'Test guidance',
            'confidence': 81.0,
            'detection_engine': 'gemini',
        }

        result, engine = _run_hybrid_detection('/tmp/sign.jpg', 'plain-upload.jpg')

        self.assertEqual(engine, 'gemini')
        self.assertEqual(result['detection_engine'], 'gemini')
        self.assertEqual(result['sign_code'], 'PW03-R1-01')
        mock_gemini.assert_called_once()

    @override_settings(
        AI_HYBRID_CONFIDENCE_THRESHOLD=70,
        AI_MIN_RESULT_CONFIDENCE=45,
        AI_LIVE_YOLO_FLOOR=10,
        GEMINI_API_KEY='test-key',
        GEMINI_ENABLED=True,
    )
    @patch('ai_detection.services._yolo_raw_detect')
    @patch('ai_detection.gemini_service.detect_sign_with_gemini')
    def test_live_capture_accepts_low_yolo_without_gemini(self, mock_gemini, mock_yolo):
        mock_yolo.return_value = {'class_key': 'no_entry', 'confidence': 10.8}

        result, engine = _run_hybrid_detection('/tmp/sign.jpg', 'webcam-456.jpg')

        self.assertEqual(engine, 'yolo')
        self.assertEqual(result['class_key'], 'no_entry')
        self.assertAlmostEqual(result['confidence'], 10.8)
        mock_gemini.assert_not_called()

    @override_settings(
        AI_HYBRID_CONFIDENCE_THRESHOLD=70,
        AI_MIN_RESULT_CONFIDENCE=45,
        AI_UPLOAD_YOLO_FLOOR=5,
        GEMINI_API_KEY='test-key',
        GEMINI_ENABLED=True,
    )
    @patch('ai_detection.services._yolo_raw_detect')
    @patch('ai_detection.gemini_service.detect_sign_with_gemini')
    def test_upload_uses_low_yolo_when_gemini_fails(self, mock_gemini, mock_yolo):
        mock_yolo.return_value = {'class_key': 'no_entry', 'confidence': 5.2}
        mock_gemini.return_value = None

        result, engine = _run_hybrid_detection('/tmp/sign.jpg', 'download.png')

        self.assertEqual(engine, 'yolo')
        self.assertEqual(result['class_key'], 'no_entry')
        self.assertAlmostEqual(result['confidence'], 5.2)

    @override_settings(
        AI_HYBRID_CONFIDENCE_THRESHOLD=70,
        AI_MIN_RESULT_CONFIDENCE=45,
        GEMINI_API_KEY='',
        GEMINI_ENABLED=False,
    )
    @patch('ai_detection.services._yolo_raw_detect')
    @patch('ai_detection.gemini_service.detect_sign_with_gemini')
    def test_skips_gemini_when_not_configured(self, mock_gemini, mock_yolo):
        mock_yolo.return_value = {'class_key': 'no_left_turn', 'confidence': 55.0}

        result, engine = _run_hybrid_detection('/tmp/sign.jpg', 'webcam-789.jpg')

        self.assertIn(engine, ('yolo', 'heuristic'))
        mock_gemini.assert_not_called()
        self.assertGreater(result['confidence'], 0)
