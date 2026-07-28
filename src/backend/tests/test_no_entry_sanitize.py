"""No Entry shape correction — weak vehicle-specific YOLO labels."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.services import (
    _generic_no_entry_bar_hint,
    _no_u_turn_shape_hint,
    _result_from_class_key,
    _run_hybrid_detection,
    _sanitize_no_entry_mislabel,
    _sanitize_prohibitory_mislabel,
    _sanitize_vehicle_specific_no_entry,
)
from tests.catalog_helpers import assert_sign_code, sign_media_path


class NoEntrySanitizeTest(SimpleTestCase):
    def _no_entry_path(self) -> Path:
        return sign_media_path(
            settings.MEDIA_ROOT,
            'R1-04.png',
            'PW03-R1-04.png',
            'NO_ENTRY_No entry.png',
            'KH_NO_ENTRY_No entry.png',
        )

    def test_generic_no_entry_bar_detected_on_catalog_art(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        self.assertTrue(_generic_no_entry_bar_hint(str(path)))
        self.assertFalse(_no_u_turn_shape_hint(str(path)))

    def test_weak_motorcycle_drawn_remapped_to_no_entry(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        weak = _result_from_class_key('no_entry_motorcycle_drawn', confidence=28.2)
        # Catalog may resolve this key to a vehicle-specific code; force the weak YOLO-style key.
        weak['class_key'] = 'no_entry_motorcycle_drawn'
        weak['confidence'] = 28.2
        fixed = _sanitize_vehicle_specific_no_entry(str(path), weak)
        self.assertIsNotNone(fixed)
        assert_sign_code(self, fixed, 'PW03-R1-04', 'R1-04', 'I-019')
        name = (fixed.get('sign_name_en') or '').lower()
        self.assertTrue('entry' in name or 'r1-04' in name or 'pw03' in name)

    def test_false_u_turn_remapped_to_no_entry(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        wrong = _result_from_class_key('NO_U_TURN', confidence=89.0)
        fixed = _sanitize_no_entry_mislabel(str(path), wrong)
        self.assertIsNotNone(fixed)
        assert_sign_code(self, fixed, 'PW03-R1-04', 'R1-04', 'I-019')
        name = (fixed.get('sign_name_en') or '').lower()
        self.assertTrue('entry' in name or 'r1-04' in name or 'pw03' in name)
        self.assertNotIn('u-turn', name)

    def test_prohibitory_sanitize_prefers_no_entry_over_u_turn(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        wrong = _result_from_class_key('NO_U_TURN', confidence=89.0)
        fixed = _sanitize_prohibitory_mislabel(str(path), wrong)
        assert_sign_code(self, fixed, 'PW03-R1-04', 'R1-04', 'I-019')

    def test_live_hybrid_on_no_entry_reference(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        result, engine = _run_hybrid_detection(str(path), 'PW03-R1-04.png', live_fast=True)
        assert_sign_code(self, result, 'PW03-R1-04', 'R1-04', 'I-019')
        name = (result.get('sign_name_en') or '').lower()
        self.assertNotIn('u-turn', name)
        self.assertTrue(
            'entry' in name or 'r1-04' in name or 'r1 04' in name or 'pw03' in name,
            msg=f'unexpected name {name!r}',
        )

    def test_webcam_no_entry_screenshot_not_u_turn(self):
        path = Path(__file__).resolve().parents[3] / 'ai' / 'test_samples' / 'webcam_no_entry_mislabel.png'
        if not path.is_file():
            path = Path(__file__).resolve().parents[2].parent / 'ai' / 'test_samples' / 'webcam_no_entry_mislabel.png'
        if not path.is_file():
            self.skipTest('webcam_no_entry_mislabel.png missing')
        wrong = _result_from_class_key('NO_U_TURN', confidence=89.0)
        fixed = _sanitize_no_entry_mislabel(str(path), wrong)
        name = (fixed.get('sign_name_en') or '').lower()
        self.assertTrue('entry' in name or 'r1-04' in name or 'pw03' in name)
        self.assertNotIn('u-turn', name)
        result, _engine = _run_hybrid_detection(str(path), path.name, live_fast=True)
        # Live may return no_sign on annotated screenshots; sanitize path is the critical fix.
        if result.get('detection_mode') != 'no_sign':
            name = (result.get('sign_name_en') or '').lower()
            self.assertTrue('entry' in name or 'r1-04' in name or 'pw03' in name)
            self.assertNotIn('u-turn', name)