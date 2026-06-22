"""OpenCV live sign presence — reject faces and empty frames."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.live_sign_presence import analyze_live_sign_presence, live_sign_present
from ai_detection.services import _run_hybrid_detection
from tests.catalog_helpers import assert_sign_code, catalog_10_active, sign_media_path


class LiveSignPresenceTest(SimpleTestCase):
    def test_no_left_turn_reference_has_sign_present(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        self.assertTrue(live_sign_present(str(path)))

    def test_live_hybrid_on_sign_reference(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'R1-01.png', 'PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('No Left Turn catalog image missing')
        result, engine = _run_hybrid_detection(str(path), 'PW03-R1-01.png')
        assert_sign_code(self, result, 'PW03-R1-01', 'R1-01')
        self.assertNotEqual(result.get('detection_mode'), 'no_sign')

    def test_live_fast_stop_sign_uses_catalog_not_handicapped_warning(self):
        path = sign_media_path(settings.MEDIA_ROOT, 'M-032.png')
        if not path.is_file():
            self.skipTest('M-032.png missing')
        result, engine = _run_hybrid_detection(str(path), 'M-032.png', live_fast=True)
        self.assertEqual(result.get('sign_code'), 'M-032')
        self.assertNotEqual(result.get('sign_code'), 'W-030')
        self.assertIn(engine, ('catalog_match', 'shape_hint', 'yolo'))

    def test_live_fast_y_junction_warning_sign(self):
        if catalog_10_active():
            self.skipTest('W-068 is outside the 10-class thesis catalog')
        path = Path(settings.MEDIA_ROOT) / 'signs' / 'W-068.png'
        if not path.is_file():
            self.skipTest('W-068.png missing')
        result, engine = _run_hybrid_detection(str(path), 'W-068.png', live_fast=True)
        self.assertEqual(result.get('sign_code'), 'W-068')
        self.assertNotEqual(result.get('sign_code'), 'W-056')
        self.assertIn(engine, ('catalog_match', 'yolo', 'shape_hint'))

    def test_face_screenshot_rejected_if_available(self):
        face = Path(
            r'C:\Users\dimsa\.cursor\projects\d-Year4-Project-Thesis-Expert-System-Project-CamTraffic'
            r'\assets\c__Users_dimsa_AppData_Roaming_Cursor_User_workspaceStorage_ef28e6b15d3bf814fcd46f16493565c9'
            r'_images_image-bfcb700c-b73b-4d04-ade6-57c0687aaf1b.png',
        )
        if not face.is_file():
            self.skipTest('face screenshot not available')
        presence = analyze_live_sign_presence(str(face))
        self.assertFalse(presence['present'])
        result, engine = _run_hybrid_detection(str(face), 'webcam-face.jpg')
        self.assertIn(result.get('detection_mode'), ('no_sign', None))
        self.assertNotEqual(result.get('sign_code'), 'P-001')
