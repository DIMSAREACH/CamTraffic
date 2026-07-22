"""OpenCV sign localization inside live webcam guide-box crops."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, override_settings

from ai_detection.sign_localization import localize_traffic_sign


class SignLocalizationTest(SimpleTestCase):
    def _sign_path(self, name: str) -> Path:
        return Path(settings.MEDIA_ROOT) / 'signs' / name

    def test_no_left_turn_localized(self):
        path = self._sign_path('PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('PW03-R1-01.png missing')
        result = localize_traffic_sign(str(path))
        try:
            self.assertTrue(result.found)
            self.assertGreater(result.crop_width, 0)
            self.assertGreater(result.crop_height, 0)
            self.assertIn(result.method, ('hough_circle', 'circle_contour', 'contour_red'))
            self.assertGreaterEqual(result.bbox['x2'], result.bbox['x1'])
            self.assertGreaterEqual(result.bbox['y2'], result.bbox['y1'])
        finally:
            if result.cleanup_path:
                Path(result.cleanup_path).unlink(missing_ok=True)

    def test_stop_sign_localized(self):
        path = self._sign_path('M-032.png')
        if not path.is_file():
            path = self._sign_path('KH_STOP_Stop.png')
        if not path.is_file():
            self.skipTest('stop sign reference missing')
        result = localize_traffic_sign(str(path))
        try:
            self.assertTrue(result.found)
            self.assertGreater(result.red_ratio, 0.04)
            self.assertGreater(result.crop_width, 32)
        finally:
            if result.cleanup_path:
                Path(result.cleanup_path).unlink(missing_ok=True)

    def test_disabled_returns_empty(self):
        path = self._sign_path('PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('PW03-R1-01.png missing')
        with override_settings(AI_LIVE_SIGN_LOCALIZATION_ENABLED=False):
            result = localize_traffic_sign(str(path))
        self.assertFalse(result.found)

    def test_debug_dict_includes_sizes(self):
        path = self._sign_path('PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('PW03-R1-01.png missing')
        result = localize_traffic_sign(str(path))
        try:
            dbg = result.to_debug_dict()
            self.assertIn('x', dbg['guide_size'])
            self.assertIn('x', dbg['crop_size'])
            self.assertIn('method', dbg)
        finally:
            if result.cleanup_path:
                Path(result.cleanup_path).unlink(missing_ok=True)
