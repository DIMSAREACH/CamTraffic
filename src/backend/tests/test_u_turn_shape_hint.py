"""No U-Turn shape correction — must not label U-turn arrows as left turn or no entry."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.services import (
    _generic_no_entry_bar_hint,
    _no_u_turn_shape_hint,
    _prohibitory_red_ring_hint,
    _result_from_class_key,
    _run_hybrid_detection,
    _sanitize_u_turn_mislabel,
    _white_field_prohibitory_hint,
)
from tests.catalog_helpers import assert_sign_code, sign_media_path, use_full_sign_catalog


class NoUTurnShapeHintTest(SimpleTestCase):
    def _u_turn_path(self) -> Path:
        return sign_media_path(
            settings.MEDIA_ROOT,
            'R1-03.png',
            'PW03-R1-03.png',
            'KH_NOUT_No U-turn.png',
            'PW03_R1_03_hq.png',
        )

    def _left_turn_path(self) -> Path:
        return sign_media_path(
            settings.MEDIA_ROOT,
            'R1-01.png',
            'PW03-R1-01.png',
            'R1_01_No left turn.png',
        )

    def test_u_turn_catalog_detected_by_shape(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        self.assertTrue(_no_u_turn_shape_hint(str(path)))

    def test_left_turn_not_detected_as_u_turn(self):
        path = self._left_turn_path()
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        self.assertFalse(_no_u_turn_shape_hint(str(path)))

    def test_u_turn_not_matched_as_no_entry_bar(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        self.assertFalse(_generic_no_entry_bar_hint(str(path)))

    def test_white_field_hint_prefers_u_turn(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        self.assertEqual(_white_field_prohibitory_hint(str(path)), 'NO_U_TURN')

    def test_wrong_yolo_left_turn_remapped_to_u_turn(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        wrong = _result_from_class_key('NO_LEFT_TURN', confidence=96.0)
        fixed = _sanitize_u_turn_mislabel(str(path), wrong)
        self.assertIsNotNone(fixed)
        assert_sign_code(self, fixed, 'PW03-R1-03', 'R1-03')
        self.assertIn('u-turn', fixed['sign_name_en'].lower())

    def test_live_hybrid_on_u_turn_reference(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        result, engine = _run_hybrid_detection(str(path), 'PW03-R1-03.png', live_fast=True)
        assert_sign_code(self, result, 'PW03-R1-03', 'R1-03')
        self.assertIn('u-turn', (result.get('sign_name_en') or '').lower())

    def test_upload_hybrid_on_u_turn_reference(self):
        path = self._u_turn_path()
        if not path.is_file():
            self.skipTest('No U-Turn catalog image missing')
        result, engine = _run_hybrid_detection(str(path), 'PW03-R1-03.png', live_fast=False)
        assert_sign_code(self, result, 'PW03-R1-03', 'R1-03')
        self.assertIn('u-turn', (result.get('sign_name_en') or '').lower())

    def test_animal_drawn_cart_not_detected_as_u_turn(self):
        ref = Path(
            r'D:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
            r'\Dim Sareach\Road signs in Cambodia\Additional signs\Animal drawn carts.png'
        )
        if not ref.is_file():
            self.skipTest('Animal drawn carts reference image missing')
        self.assertFalse(_prohibitory_red_ring_hint(str(ref)))
        self.assertFalse(_no_u_turn_shape_hint(str(ref)))
        self.assertIsNone(_white_field_prohibitory_hint(str(ref)))
        with use_full_sign_catalog():
            result, engine = _run_hybrid_detection(str(ref), 'Animal drawn carts.png', live_fast=False)
            self.assertEqual(result.get('sign_code'), 'I-001')
        self.assertIn('animal', (result.get('sign_name_en') or '').lower())
        self.assertNotIn('u-turn', (result.get('sign_name_en') or '').lower())

    def test_additional_signs_named_uploads_match_filename(self):
        folder = Path(
            r'D:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
            r'\Dim Sareach\Road signs in Cambodia\Additional signs'
        )
        if not folder.is_dir():
            self.skipTest('Additional signs reference folder missing')
        import json

        catalog_path = Path(__file__).resolve().parents[2] / 'ai' / 'sign_catalog.json'
        by_name = {
            row['sign_name_en'].strip(): row['sign_code']
            for row in json.loads(catalog_path.read_text(encoding='utf-8'))
            if row.get('sign_name_en')
        }
        with use_full_sign_catalog():
            for image_path in sorted(folder.glob('*.png')):
                expected = by_name.get(image_path.stem)
                if not expected:
                    continue
                result, _engine = _run_hybrid_detection(str(image_path), image_path.name, live_fast=False)
                self.assertEqual(
                    result.get('sign_code'),
                    expected,
                    msg=f'{image_path.name} expected {expected}, got {result.get("sign_code")} ({result.get("sign_name_en")})',
                )
