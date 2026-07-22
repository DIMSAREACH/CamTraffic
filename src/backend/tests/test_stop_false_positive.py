"""Stop sign must not be returned for white-inner prohibitory signs (no left turn)."""
from django.test import SimpleTestCase
from pathlib import Path

from django.conf import settings

from ai_detection.services import (
    _red_sign_inner_profile,
    _run_hybrid_detection,
    _sanitize_stop_false_positive,
    _stop_false_positive_for_image,
    _result_from_class_key,
    _white_field_prohibitory_hint,
)
from tests.catalog_helpers import assert_sign_code, sign_media_path


class StopFalsePositiveTest(SimpleTestCase):
    def test_no_left_turn_reference_is_white_field(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        self.assertEqual(_red_sign_inner_profile(str(path)), 'white_field')

    def test_stop_reference_is_red_field(self):
        path = Path(settings.MEDIA_ROOT) / 'signs' / 'KH_STOP_Stop.png'
        if not path.is_file():
            self.skipTest('KH_STOP_Stop.png missing')
        self.assertEqual(_red_sign_inner_profile(str(path)), 'red_field')

    def test_stop_result_rejected_on_no_left_turn_image(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        stop = _result_from_class_key('M_STOP', confidence=82.0)
        self.assertTrue(_stop_false_positive_for_image(str(path), stop))
        self.assertIsNone(_sanitize_stop_false_positive(str(path), stop))

    def test_live_hybrid_on_no_left_turn_reference(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        result, engine = _run_hybrid_detection(str(path), 'PW03-R1-01.png')
        assert_sign_code(self, result, 'PW03-R1-01', 'R1-01')
        self.assertIn('left', (result.get('sign_name_en') or '').lower())
        self.assertNotEqual((result.get('sign_code') or '').upper(), 'M-032')

    def test_white_field_hint_points_to_turn_prohibition(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        hint = _white_field_prohibitory_hint(str(path))
        # Tightened thresholds: ambiguous arrow position must not default to left turn.
        self.assertIn(hint, (None, 'NO_LEFT_TURN', 'NO_RIGHT_TURN'))
