"""Catalog name resolution for YOLO training keys and live webcam."""
from django.test import SimpleTestCase

from ai_detection.services import _catalog_row_for_token, _resolve_official_sign_labels, _result_from_class_key
from tests.catalog_helpers import assert_sign_code, use_full_sign_catalog


class SignCatalogMappingTest(SimpleTestCase):
    def test_yolo_no_entry_motor_vehicles_maps_to_catalog(self):
        with use_full_sign_catalog():
            row = _catalog_row_for_token('NO_ENTRY_MOTOR_VEHICLES')
            self.assertIsNotNone(row)
            self.assertEqual(row['class_key'], 'P_NO_MOTOR_VEHICLES')
            self.assertEqual(row['sign_code'], 'P-016')

    def test_yolo_no_entry_bicycle_maps_to_catalog(self):
        with use_full_sign_catalog():
            row = _catalog_row_for_token('NO_ENTRY_BICYCLE')
            self.assertIsNotNone(row)
            self.assertEqual(row['class_key'], 'P_NO_BICYCLES')

    def test_result_from_class_key_uses_real_catalog_name(self):
        with use_full_sign_catalog():
            result = _result_from_class_key('NO_ENTRY_LARGE_TRUCK', confidence=91.0)
            self.assertEqual(result['sign_code'], 'P-027')
            self.assertEqual(result['class_key'], 'p_no_trucks')
            self.assertIn('truck', result['sign_name_en'].lower())
            self.assertNotIn('Traffic Sign', result['sign_name_en'])

    def test_result_from_class_key_stop_uses_catalog(self):
        result = _result_from_class_key('M_STOP', confidence=88.0)
        self.assertEqual(result['class_key'], 'm_stop')
        self.assertTrue(result['sign_name_en'] or result['sign_name'])

    def test_resolve_official_sign_labels_fixes_placeholder(self):
        raw = {
            'class_key': 'NO_LEFT_TURN',
            'sign_code': 'NO-LEFT-TURN',
            'sign_name': 'Traffic Sign NO-LEFT-TURN',
            'sign_name_en': 'Traffic Sign NO-LEFT-TURN',
            'confidence': 88.0,
        }
        fixed = _resolve_official_sign_labels(raw)
        assert_sign_code(self, fixed, 'PW03-R1-01', 'R1-01')
        self.assertEqual(fixed['sign_name_km'], 'ហាមបត់ឆ្វេង')
        self.assertEqual(fixed['sign_name_en'], 'No Left Turn')
