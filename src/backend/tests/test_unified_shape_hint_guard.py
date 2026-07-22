"""Unified pipeline must not mislabel prohibitory signs via shape_hint."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.services import (
    _filename_class_hint,
    _run_hybrid_detection,
    _shape_hints_enabled,
    _white_field_prohibitory_hint,
)
from tests.catalog_helpers import assert_sign_code, equivalent_sign_codes, sign_media_path


class UnifiedShapeHintGuardTest(SimpleTestCase):
    def test_shape_hints_disabled_for_unified_prep(self):
        self.assertFalse(_shape_hints_enabled(upload=True, unified_prep=True))

    def test_filename_hint_resolves_no_right_turn_class_key(self):
        hint = _filename_class_hint('upload-NO-RIGHT-TURN.jpg')
        self.assertEqual(hint, 'no_right_turn')

    def test_no_right_turn_image_unified_not_left_turn(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-02.png', 'PW03-R1-02.png', 'NO-RIGHT-TURN.png')
        if not path.is_file():
            self.skipTest('No Right Turn catalog image missing')
        hint_name = f'upload-{path.stem}.jpg'
        result, engine = _run_hybrid_detection(
            str(path),
            hint_name,
            unified_prep=True,
        )
        assert_sign_code(self, result, 'PW03-R1-02', 'R1-02')
        self.assertNotIn((result.get('sign_code') or '').upper().replace('_', '-'), equivalent_sign_codes('PW03-R1-01', 'R1-01'))
        self.assertNotEqual(engine, 'shape_hint')

    def test_no_right_turn_webcam_unified_no_shape_hint_mislabel(self):
        """Generic webcam name must not map no-right-turn image to no-left-turn."""
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-02.png', 'PW03-R1-02.png', 'NO-RIGHT-TURN.png')
        if not path.is_file():
            self.skipTest('No Right Turn catalog image missing')
        result, engine = _run_hybrid_detection(
            str(path),
            'webcam-test.jpg',
            unified_prep=True,
        )
        actual = (result.get('sign_code') or '').upper().replace('_', '-')
        self.assertNotIn(actual, equivalent_sign_codes('PW03-R1-01', 'R1-01'))
        self.assertNotEqual(engine, 'shape_hint')

    def test_no_left_turn_image_unified(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png', 'NO-LEFT-TURN.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        result, engine = _run_hybrid_detection(
            str(path),
            'upload-NO-LEFT-TURN.jpg',
            unified_prep=True,
        )
        assert_sign_code(self, result, 'PW03-R1-01', 'R1-01')
        self.assertNotEqual(engine, 'shape_hint')

    def test_ambiguous_arrow_hint_returns_none(self):
        """Center-biased metrics should not default to left turn."""
        path = Path(settings.MEDIA_ROOT) / 'signs' / 'NO-RIGHT-TURN.png'
        if not path.is_file():
            self.skipTest('NO-RIGHT-TURN.png missing')
        hint = _white_field_prohibitory_hint(str(path))
        self.assertIn(hint, (None, 'NO_RIGHT_TURN'))
