"""
Test Video Detection with YOLO-Style Overlays

DEPRECATED — use the Django management command instead:

    cd src/backend
    python manage.py test_video_yolo path/to/video.mp4

This wrapper redirects to the management command with the correct settings module.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    backend = repo / 'src' / 'backend'
    manage = backend / 'manage.py'
    if not manage.is_file():
        print('Error: src/backend/manage.py not found.')
        return 1

    video = sys.argv[1] if len(sys.argv) > 1 else ''
    if not video:
        print('Usage: python scripts/detection/test_video_detection_yolo_style.py <video_path> [--max-frames N]')
        print('Preferred: cd src/backend && python manage.py test_video_yolo <video_path>')
        return 2

    cmd = [sys.executable, str(manage), 'test_video_yolo', video, *sys.argv[2:]]
    env = os.environ.copy()
    env.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    print('→', ' '.join(cmd))
    return subprocess.call(cmd, cwd=str(backend), env=env)


if __name__ == '__main__':
    raise SystemExit(main())
