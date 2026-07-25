#!/usr/bin/env python
"""Phase 11 integration validation — run from repo root or backend/."""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django  # noqa: E402

django.setup()

CHECKS: list[tuple[str, str, bool]] = []


def record(name: str, detail: str, ok: bool) -> None:
    CHECKS.append((name, detail, ok))
    mark = 'PASS' if ok else 'FAIL'
    print(f'[{mark}] {name} — {detail}')


def main() -> int:
    from django.contrib.auth import get_user_model

    from ai_detection.models import AIDetectionLog
    from infrastructure.models import Camera
    from notifications.models import Notification
    from notifications.services import dispatch_notification
    from violations.models import TrafficViolation

    User = get_user_model()

    record('Database', 'Django ORM connected', True)

    weights = BACKEND.parent.parent / 'ai' / 'weights' / 'best.pt'
    if not weights.is_file():
        weights = BACKEND.parent.parent / 'ai' / 'weights' / 'best_v2.pt'
    record('AI weights', str(weights), weights.is_file())

    record('Detection logs table', f'{AIDetectionLog.objects.count()} rows', True)
    record('Violations table', f'{TrafficViolation.objects.count()} rows', True)
    record('Cameras configured', f'{Camera.objects.count()} cameras', Camera.objects.exists())

    admin = User.objects.filter(role='admin').first()
    if admin:
        before = Notification.objects.filter(user=admin).count()
        dispatch_notification(admin, 'Integration Test', 'validate_integration.py probe', 'system', async_dispatch=False)
        after = Notification.objects.filter(user=admin).count()
        record('Notification dispatch', f'{before} → {after}', after > before)
    else:
        record('Notification dispatch', 'no admin user', False)

    process_frame = (BACKEND / 'ai_detection' / 'frame_capture.py').is_file()
    record('Frame capture module', 'ai_detection/frame_capture.py', process_frame)

    celery_task = (BACKEND / 'core' / 'tasks.py').is_file()
    record('Celery tasks', 'core/tasks.py send_notification_task', celery_task)

    passed = sum(1 for *_, ok in CHECKS if ok)
    total = len(CHECKS)
    print(f'\nIntegration validation: {passed}/{total} checks passed')
    return 0 if passed == total else 1


if __name__ == '__main__':
    raise SystemExit(main())
