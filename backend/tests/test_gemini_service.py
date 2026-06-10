"""Tests for Gemini Vision service helpers."""
import json

from django.test import SimpleTestCase, override_settings

from ai_detection.gemini_service import _extract_json, _match_catalog, _row_by_class_key, gemini_available


class GeminiServiceTest(SimpleTestCase):
    def test_extract_json_from_fenced_block(self):
        text = 'Here is the result:\n```json\n{"recognized": true, "sign_code": "PW03-R1-01"}\n```'
        parsed = _extract_json(text)
        self.assertTrue(parsed['recognized'])
        self.assertEqual(parsed['sign_code'], 'PW03-R1-01')

    def test_match_catalog_by_sign_code(self):
        row = _match_catalog(sign_code='PW03-R1-04')
        self.assertIsNotNone(row)
        self.assertEqual(row['class_key'], 'NO_ENTRY')

    def test_match_catalog_by_international_alias(self):
        row = _match_catalog(sign_name_en='No Entry')
        self.assertIsNotNone(row)
        self.assertEqual(row['class_key'], 'NO_ENTRY')

    def test_row_by_class_key_normalizes_case(self):
        row = _row_by_class_key('no_entry')
        self.assertIsNotNone(row)
        self.assertEqual(row['class_key'], 'NO_ENTRY')

    @override_settings(GEMINI_API_KEY='abc', GEMINI_ENABLED=True)
    def test_gemini_available_with_key(self):
        self.assertTrue(gemini_available())

    @override_settings(GEMINI_API_KEY='', GEMINI_ENABLED=True)
    def test_gemini_unavailable_without_key(self):
        self.assertFalse(gemini_available())

    def test_extract_plain_json(self):
        parsed = _extract_json(json.dumps({'recognized': False}))
        self.assertFalse(parsed['recognized'])
