import tempfile
from pathlib import Path

import pytest

from ai_detection.video_utils import build_annotated_preview_video


cv2 = pytest.importorskip('cv2')


def test_build_annotated_preview_video_writes_mp4():
    paths: list[str] = []
    try:
        for i in range(2):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            tmp.close()
            img = __import__('numpy').zeros((120, 160, 3), dtype='uint8')
            img[:, :, 0] = 40 + i * 50
            assert cv2.imwrite(tmp.name, img)
            paths.append(tmp.name)
        out = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        out.close()
        ok = build_annotated_preview_video(paths, out.name, fps=2.0)
        assert ok is True
        assert Path(out.name).stat().st_size > 500
    finally:
        for p in paths:
            Path(p).unlink(missing_ok=True)
        if 'out' in locals():
            Path(out.name).unlink(missing_ok=True)
