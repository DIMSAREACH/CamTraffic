"""Tasks 183-184 — Camera frame simulator.

Provides an RTSP stream connector (when available) and a file/test-image
fallback.  Used by both integration tests and the live demo script.

Usage (RTSP):
    from tests.integration.camera_simulator import CameraSimulator
    with CameraSimulator(rtsp_url='rtsp://192.168.1.100:554/live') as cam:
        for frame_bytes in cam.frames(max_frames=5):
            # frame_bytes is a JPEG-encoded bytes object
            ...

Usage (file-based / CI):
    with CameraSimulator(image_path='tests/fixtures/sample_frame.jpg') as cam:
        for frame_bytes in cam.frames(max_frames=3):
            ...

Usage (synthetic / no file):
    with CameraSimulator() as cam:  # generates a minimal synthetic JPEG
        for frame_bytes in cam.frames(max_frames=1):
            ...
"""

from __future__ import annotations

import io
import struct
import time
import zlib
from pathlib import Path
from typing import Generator

# ── Minimal synthetic JPEG / PNG helpers (no heavy deps needed) ───────────────

def _minimal_jpeg(width: int = 64, height: int = 64) -> bytes:
    """Return a tiny valid JPEG (white rectangle) without Pillow or cv2."""
    try:
        from PIL import Image as _PILImage  # type: ignore[import]
        buf = io.BytesIO()
        _PILImage.new('RGB', (width, height), color=(255, 200, 100)).save(buf, format='JPEG')
        return buf.getvalue()
    except ImportError:
        pass

    # Minimal JPEG fallback (grayscale 1x1 white pixel).
    # SOI + APP0 + DQT + SOF0 + DHT + SOS + EOI
    return (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e'
        b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
        b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00'
        b'\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
        b'\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05'
        b'\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!'
        b'1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1'
        b'\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJ'
        b'STUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a'
        b'\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7'
        b'\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4'
        b'\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda'
        b'\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5'
        b'\xf6\xf7\xf8\xf9\xfa'
        b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xff\xd9'
    )


# ── Camera Simulator ──────────────────────────────────────────────────────────

class CameraSimulator:
    """Simulate a camera RTSP stream or replay from a file or synthetic image.

    Priority:
      1. rtsp_url — live OpenCV VideoCapture
      2. image_path — read a JPEG/PNG file and loop it
      3. synthetic — generate a minimal in-memory JPEG
    """

    def __init__(
        self,
        rtsp_url: str | None = None,
        image_path: str | Path | None = None,
        fps_target: float = 2.0,
    ) -> None:
        self.rtsp_url    = rtsp_url
        self.image_path  = Path(image_path) if image_path else None
        self.fps_target  = fps_target
        self._cap        = None  # OpenCV VideoCapture (RTSP mode)
        self._mode: str  = 'synthetic'

    def __enter__(self) -> 'CameraSimulator':
        if self.rtsp_url:
            try:
                import cv2  # type: ignore[import]
                self._cap = cv2.VideoCapture(self.rtsp_url)
                if self._cap.isOpened():
                    self._mode = 'rtsp'
                    print(f'[CameraSimulator] RTSP connected: {self.rtsp_url}')
                else:
                    self._cap.release()
                    self._cap = None
                    print(f'[CameraSimulator] RTSP unavailable, falling back to image/synthetic')
            except ImportError:
                print('[CameraSimulator] opencv-python not installed, falling back to image/synthetic')

        if self._cap is None:
            if self.image_path and self.image_path.exists():
                self._mode = 'file'
                print(f'[CameraSimulator] File mode: {self.image_path}')
            else:
                self._mode = 'synthetic'
                print('[CameraSimulator] Synthetic mode: generating test JPEG')
        return self

    def __exit__(self, *_) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def read_frame(self) -> bytes | None:
        """Read a single JPEG-encoded frame.  Returns None on error."""
        if self._mode == 'rtsp' and self._cap is not None:
            import cv2  # type: ignore[import]
            ret, frame = self._cap.read()
            if not ret:
                return None
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return bytes(buf)

        if self._mode == 'file' and self.image_path:
            return self.image_path.read_bytes()

        return _minimal_jpeg()

    def frames(
        self,
        max_frames: int = 10,
        interval_s: float | None = None,
    ) -> Generator[bytes, None, None]:
        """Yield up to *max_frames* JPEG-encoded frames.

        Args:
            max_frames: stop after this many frames.
            interval_s: sleep between frames (default: 1/fps_target).
        """
        sleep_s = interval_s if interval_s is not None else (1.0 / self.fps_target)
        for _ in range(max_frames):
            frame = self.read_frame()
            if frame is None:
                break
            yield frame
            if sleep_s > 0:
                time.sleep(sleep_s)

    @property
    def mode(self) -> str:
        return self._mode

    @staticmethod
    def synthetic_frame() -> bytes:
        """Return a single synthetic JPEG without instantiating CameraSimulator."""
        return _minimal_jpeg()
