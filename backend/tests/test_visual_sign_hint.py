"""Visual sign heuristics must not confuse red circles with stop octagons."""
from django.test import SimpleTestCase

from ai_detection.services import _result_from_class_key, _visual_sign_class_hint
from tests.catalog_helpers import assert_sign_code


class VisualSignHintTest(SimpleTestCase):
    def test_no_left_turn_catalog_name(self):
        result = _result_from_class_key('NO_LEFT_TURN', confidence=88.0)
        assert_sign_code(self, result, 'PW03-R1-01', 'R1-01')
        self.assertIn('left', result['sign_name_en'].lower())

    def test_visual_returns_none_for_missing_image(self):
        self.assertIsNone(_visual_sign_class_hint('/nonexistent/path.jpg', strict=True))
