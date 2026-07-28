"""Unit tests for OpenCV capture helpers."""
from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import numpy as np
from django.test import SimpleTestCase, override_settings

from ai_detection.opencv_utils import (
    enhance_dark_bgr,
    grab_frame,
    open_video_capture,
    resize_max_side,
    write_jpeg,
)


class OpenCVUtilsTest(SimpleTestCase):
    def test_enhance_leaves_bright_frame(self):
        bright = np.full((64, 64, 3), 180, dtype=np.uint8)
        out = enhance_dark_bgr(bright)
        self.assertEqual(out.shape, bright.shape)
        self.assertAlmostEqual(float(np.mean(out)), float(np.mean(bright)), delta=1.0)

    def test_enhance_brightens_dark_frame(self):
        dark = np.full((64, 64, 3), 30, dtype=np.uint8)
        out = enhance_dark_bgr(dark)
        self.assertGreater(float(np.mean(out)), float(np.mean(dark)))

    def test_resize_max_side(self):
        big = np.zeros((2000, 3000, 3), dtype=np.uint8)
        out = resize_max_side(big, max_side=1000)
        self.assertEqual(max(out.shape[:2]), 1000)

    @override_settings(AI_CAPTURE_ENHANCE=True, AI_CAPTURE_MAX_SIDE=640)
    def test_write_jpeg_roundtrip(self):
        frame = np.zeros((120, 160, 3), dtype=np.uint8)
        frame[:, :] = (40, 50, 60)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            path = tmp.name
        try:
            self.assertTrue(write_jpeg(path, frame, enhance=True))
            loaded = cv2.imread(path)
            self.assertIsNotNone(loaded)
            self.assertGreater(float(np.mean(loaded)), 40.0)
        finally:
            Path(path).unlink(missing_ok=True)

    def test_grab_frame_from_written_video(self):
        with tempfile.TemporaryDirectory() as td:
            video_path = str(Path(td) / 'clip.avi')
            writer = cv2.VideoWriter(
                video_path,
                cv2.VideoWriter_fourcc(*'MJPG'),
                5.0,
                (80, 60),
            )
            self.assertTrue(writer.isOpened())
            for i in range(8):
                frame = np.full((60, 80, 3), i * 20, dtype=np.uint8)
                writer.write(frame)
            writer.release()

            cap = open_video_capture(video_path, live=False)
            self.assertTrue(cap.isOpened())
            try:
                frame = grab_frame(cap, live=False)
                self.assertIsNotNone(frame)
                self.assertEqual(frame.shape[1], 80)
            finally:
                cap.release()
