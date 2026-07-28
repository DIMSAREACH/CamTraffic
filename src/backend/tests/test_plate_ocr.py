"""Tests for Cambodian license plate OCR."""
from unittest.mock import MagicMock, patch

import numpy as np
from django.test import SimpleTestCase, override_settings

from ai_detection.plate_ocr import (
    classify_plate_type,
    enrich_plate_result,
    lookup_plate_province,
    normalize_plate_text,
    plate_ocr_enabled,
    recognize_plate,
)


class PlateNormalizeTest(SimpleTestCase):
    def test_standard_private_plate(self):
        self.assertEqual(normalize_plate_text('2A-1234'), '2A-1234')
        self.assertEqual(normalize_plate_text('2a 1234'), '2A-1234')
        self.assertEqual(normalize_plate_text('2A1234'), '2A-1234')

    def test_rejects_garbage(self):
        self.assertIsNone(normalize_plate_text('hello world'))
        self.assertIsNone(normalize_plate_text(''))

    def test_leading_digit_lookalike_letter(self):
        # EasyOCR reads the province digit 1 as I/L/T/J and drops the dash on
        # motorbike plates, e.g. white-on-dark '1LK-9540' -> 'ILK 9540'.
        self.assertEqual(normalize_plate_text('ILK 9540'), '1LK-9540')
        self.assertEqual(normalize_plate_text('ILK9540'), '1LK-9540')
        # Close-up moto plates: leading 1→A and ghost trailing digit.
        self.assertEqual(normalize_plate_text('ALK 95401'), '1LK-9540')
        self.assertEqual(normalize_plate_text('ALK95401'), '1LK-9540')
        self.assertEqual(normalize_plate_text('ALK-9540'), '1LK-9540')

    def test_series_letter_m_preferred_over_o(self):
        # EasyOCR often reads M as O/0 (2CM-1679 → 2C0-1679 / 2CO-1679).
        self.assertEqual(normalize_plate_text('2C0-1679'), '2CM-1679')
        self.assertEqual(normalize_plate_text('2CO-1679'), '2CM-1679')
        self.assertEqual(normalize_plate_text('2CM-1679'), '2CM-1679')

    def test_classify_private(self):
        self.assertEqual(classify_plate_type('2A-1234'), 'private')

    def test_province_lookup_single_digit_is_vehicle_class_not_province(self):
        # Modern plates: leading digit is vehicle class (2=car), not Battambang.
        self.assertIsNone(lookup_plate_province('2A-1234'))
        self.assertIsNone(lookup_plate_province('2CM-1679'))

    def test_province_lookup_two_digit_phnom_penh(self):
        province = lookup_plate_province('12A-5678')
        self.assertIsNotNone(province)
        self.assertEqual(province['code'], '12')
        self.assertEqual(province['name_en'], 'Phnom Penh')

    def test_province_lookup_unknown(self):
        self.assertIsNone(lookup_plate_province('POL-001'))

    def test_ocr_printed_province_beats_digit_prefix(self):
        """2U-3108 + PHNOM PENH → Phnom Penh (12), keep visible serial 2U-3108."""
        result = enrich_plate_result('2U-3108', {
            'raw_reads': [
                {'text': '2U-3108', 'raw_text': '2U-3108', 'confidence': 91.0},
                {
                    'text': 'PHNOM PENH',
                    'raw_text': 'PHNOM PENH',
                    'confidence': 80.0,
                    'is_province_line': True,
                },
            ],
        })
        self.assertEqual(result['plate_province_en'], 'Phnom Penh')
        self.assertEqual(result['plate_province_code'], '12')
        self.assertEqual(result.get('plate_text', '2U-3108'), '2U-3108')
        # Class digit is not a province code, so no digit mismatch flag.
        self.assertFalse(result.get('digit_province_mismatch'))

    def test_khmer_phnom_penh_beats_class_digit(self):
        """2CM-1679 + ភ្នំពេញ → Phnom Penh (not Battambang from digit 2)."""
        result = enrich_plate_result('2CM-1679', {
            'raw_reads': [
                {'text': '2CM-1679', 'raw_text': '2CM-1679', 'confidence': 99.0},
                {
                    'text': 'ភ្នំពេញ',
                    'raw_text': 'ភ្នំពេញ',
                    'confidence': 70.0,
                    'is_province_line': True,
                },
            ],
        })
        self.assertEqual(result['plate_province_en'], 'Phnom Penh')
        self.assertEqual(result['plate_province_km'], 'ភ្នំពេញ')
        self.assertEqual(result['plate_province_code'], '12')

    def test_garbled_phnom_penh_ocr_hint(self):
        from ai_detection.plate_ocr import detect_province_from_ocr_text
        for garbled in ('PRYOM PZN', 'PSORPIVE', 'PAOMPN', 'PKIOM PIN', 'onm', 'jnm', 'dnm'):
            hit = detect_province_from_ocr_text(garbled, '2CM-1679')
            self.assertIsNotNone(hit, garbled)
            self.assertEqual(hit['code'], '12', garbled)
            self.assertEqual(hit['name_en'], 'Phnom Penh', garbled)


class PlateOCRServiceTest(SimpleTestCase):
    def test_disabled_returns_empty(self):
        with override_settings(AI_PLATE_OCR_ENABLED=False):
            self.assertFalse(plate_ocr_enabled())
            result = recognize_plate('/tmp/car.jpg', [])
            self.assertEqual(result['plate_text'], '')
            self.assertEqual(result['ocr_engine'], 'none')

    @override_settings(AI_PLATE_OCR_ENABLED=True, AI_PLATE_OCR_MIN_CONFIDENCE=0.4)
    @patch('ai_detection.plate_ocr.link_plate_to_vehicle', return_value=None)
    @patch('ai_detection.plate_ocr.Path.is_file', return_value=True)
    @patch('ai_detection.plate_ocr.cv2.imread')
    @patch('ai_detection.plate_ocr._get_reader')
    def test_recognizes_plate_from_vehicle_crop(
        self, mock_reader_fn, mock_imread, _mock_is_file, _mock_link,
    ):
        mock_imread.return_value = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_reader = MagicMock()
        mock_reader.readtext.return_value = [
            ([[0, 0], [10, 0], [10, 5], [0, 5]], '2A-1234', 0.88),
        ]
        mock_reader_fn.return_value = mock_reader

        vehicles = [{
            'vehicle_type': 'car',
            'label': 'Car',
            'confidence': 90.0,
            'bbox': {'x1': 0.1, 'y1': 0.2, 'x2': 0.8, 'y2': 0.9},
        }]
        result = recognize_plate('/tmp/car.jpg', vehicles)

        self.assertEqual(result['plate_text'], '2A-1234')
        self.assertGreaterEqual(result['plate_confidence'], 88.0)
        self.assertEqual(result['plate_type'], 'private')
        # Leading 2 is vehicle class, not Battambang — no printed province → empty.
        self.assertEqual(result.get('plate_province_en') or '', '')
        self.assertEqual(result['ocr_engine'], 'easyocr')

    @override_settings(AI_PLATE_OCR_ENABLED=True)
    @patch('ai_detection.plate_ocr.Path.is_file', return_value=False)
    def test_missing_file_returns_empty(self, _mock_is_file):
        result = recognize_plate('/missing.jpg', [])
        self.assertEqual(result['plate_text'], '')

    def test_plate_hint_from_roboflow_filename(self):
        from ai_detection.plate_ocr import _plate_hint_from_filename
        from pathlib import Path

        hint = _plate_hint_from_filename(Path('BTM2C-5927_jpg.rf.d54b74f4b7061b3fcf42ba544b0b6450.jpg'))
        self.assertIsNotNone(hint)
        self.assertEqual(hint['text'], '2C-5927')
