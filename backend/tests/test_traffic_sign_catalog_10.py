"""Tests for the 10-class Cambodian traffic sign catalog."""
from __future__ import annotations

import json
from pathlib import Path

from django.test import SimpleTestCase

from ai_detection.sign_catalog_loader import load_sign_catalog_rows, resolve_catalog_path

ROOT = Path(__file__).resolve().parents[2]
CATALOG_10_PATH = ROOT / 'ai' / 'traffic_sign_catalog_10.json'


class TrafficSignCatalog10Tests(SimpleTestCase):
    def test_catalog_file_exists_with_ten_signs(self):
        self.assertTrue(CATALOG_10_PATH.is_file(), 'Run scripts/generate_traffic_sign_catalog_10.py')
        payload = json.loads(CATALOG_10_PATH.read_text(encoding='utf-8'))
        signs = payload['signs']
        self.assertEqual(len(signs), 10)
        self.assertEqual(payload['total_classes'], 10)
        self.assertEqual(payload['model'], 'YOLOv8')

    def test_no_entry_metadata(self):
        payload = json.loads(CATALOG_10_PATH.read_text(encoding='utf-8'))
        no_entry = next(row for row in payload['signs'] if row['class_key'] == 'NO_ENTRY')
        self.assertEqual(no_entry['id'], 0)
        self.assertEqual(no_entry['sign_name_en'], 'No Entry')
        self.assertEqual(no_entry['sign_name_km'], 'ហាមចូល')
        self.assertEqual(no_entry['sign_code'], 'R1-04')
        self.assertEqual(no_entry['category'], 'Prohibitory Sign')
        self.assertEqual(
            no_entry['description_en'],
            'Vehicles are prohibited from entering this road.',
        )

    def test_loader_normalizes_thesis_fields(self):
        rows = load_sign_catalog_rows(force_reload=True)
        if resolve_catalog_path().name != 'traffic_sign_catalog_10.json':
            self.skipTest('10-class catalog not active')
        no_entry = next(row for row in rows if row['class_key'] == 'NO_ENTRY')
        self.assertEqual(no_entry['sign_code'], 'R1-04')
        self.assertEqual(no_entry['description'], no_entry['description_km'])
        self.assertEqual(no_entry['category'], 'prohibitory')
        self.assertEqual(no_entry['official_sign_code'], 'PW03-R1-04')

    def test_loader_returns_rows_for_all_class_keys(self):
        rows = load_sign_catalog_rows(force_reload=True)
        if resolve_catalog_path().name == 'traffic_sign_catalog_10.json':
            keys = {row['class_key'] for row in rows}
            self.assertEqual(
                keys,
                {
                    'NO_ENTRY',
                    'NO_LEFT_TURN',
                    'NO_RIGHT_TURN',
                    'NO_U_TURN',
                    'NO_PARKING',
                    'M_STOP',
                    'P_SPEED_LIMIT_20_KM_H',
                    'P_SPEED_LIMIT_50_KM_H',
                    'W_PEDESTRIAN_CROSSING',
                    'I_ONE_WAY_TRAFFIC',
                },
            )
