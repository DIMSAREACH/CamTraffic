"""Unified sign pipeline — same preprocess for upload and webcam."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.sign_pipeline import prepare_unified_sign_input, preprocess_sign_bgr
import cv2


class SignPipelineTest(SimpleTestCase):
    def _sign_path(self, name: str) -> Path:
        return Path(settings.MEDIA_ROOT) / 'signs' / name

    def test_preprocess_outputs_640(self):
        path = self._sign_path('PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('PW03-R1-01.png missing')
        img = cv2.imread(str(path))
        out, dbg = preprocess_sign_bgr(img)
        self.assertEqual(out.shape[0], 640)
        self.assertEqual(out.shape[1], 640)
        self.assertEqual(dbg['size'], '640x640')

    def test_unified_pipeline_writes_yolo_input(self):
        path = self._sign_path('PW03-R1-01.png')
        if not path.is_file():
            self.skipTest('PW03-R1-01.png missing')
        prep = prepare_unified_sign_input(str(path), localize=True)
        try:
            self.assertTrue(Path(prep.yolo_path).is_file())
            yolo_img = cv2.imread(prep.yolo_path)
            self.assertIsNotNone(yolo_img)
            self.assertEqual(yolo_img.shape[:2], (640, 640))
        finally:
            for item in prep.cleanup_paths:
                Path(item).unlink(missing_ok=True)

    def test_webcam_and_upload_share_same_yolo_size(self):
        path = self._sign_path('M-032.png')
        if not path.is_file():
            self.skipTest('M-032.png missing')
        prep = prepare_unified_sign_input(str(path), localize=True)
        try:
            trace = prep.to_debug_dict()
            self.assertIn('640x640', trace.get('size', ''))
        finally:
            for item in prep.cleanup_paths:
                Path(item).unlink(missing_ok=True)
