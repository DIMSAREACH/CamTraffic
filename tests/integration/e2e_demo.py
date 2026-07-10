"""Task 192 — End-to-End Demo Script.

Runs the full CamTraffic pipeline against a running backend + AI service:
  camera frame → process-frame API → detection → violation → fine → notification

Usage (against local dev stack):
    python tests/integration/e2e_demo.py
    python tests/integration/e2e_demo.py --backend http://localhost:8000 --ai http://localhost:8001
    python tests/integration/e2e_demo.py --rtsp rtsp://192.168.1.100:554/live --camera-id 1

Prerequisites:
    - Backend running:    docker compose up backend  (or: cd backend && python manage.py runserver)
    - AI service running: docker compose up ai-service (or: cd ai-service && uvicorn app.main:app)
    - Admin account exists with EMAIL/PASSWORD below (or override via env vars)

Output:
    Prints a step-by-step status table showing pass/fail for each pipeline stage.
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[2]

# ── Config (override via env vars or CLI) ──────────────────────────────────────

DEFAULT_BACKEND   = os.getenv('CAMTRAFFIC_BACKEND_URL',  'http://localhost:8000')
DEFAULT_AI        = os.getenv('CAMTRAFFIC_AI_URL',       'http://localhost:8001')
DEFAULT_EMAIL     = os.getenv('CAMTRAFFIC_ADMIN_EMAIL',  'admin@camtraffic.kh')
DEFAULT_PASSWORD  = os.getenv('CAMTRAFFIC_ADMIN_PASS',   'admin1234')
DEFAULT_CAMERA_ID = int(os.getenv('CAMTRAFFIC_CAMERA_ID', '1'))


# ── Step result tracking ──────────────────────────────────────────────────────

@dataclass
class Step:
    task_id: str
    name: str
    passed: bool = False
    detail: str = ''
    elapsed_ms: float = 0.0


@dataclass
class DemoReport:
    steps: list[Step] = field(default_factory=list)

    def add(self, step: Step) -> None:
        icon = '✅' if step.passed else '❌'
        print(f'  {icon}  [{step.task_id}] {step.name}  ({step.elapsed_ms:.0f} ms)')
        if step.detail:
            print(f'        {step.detail}')
        self.steps.append(step)

    @property
    def passed_count(self) -> int:
        return sum(1 for s in self.steps if s.passed)

    @property
    def total(self) -> int:
        return len(self.steps)

    def print_summary(self) -> None:
        bar = '=' * 62
        print(f'\n{bar}')
        print(f' E2E Demo Summary — {self.passed_count}/{self.total} steps passed')
        print(bar)
        for s in self.steps:
            icon = '✅' if s.passed else '❌'
            print(f'  {icon}  [{s.task_id}] {s.name}')
        print(bar)


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _get(session, url: str) -> dict:
    try:
        import requests
        r = session.get(url, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        return {'error': str(exc)}


def _post_json(session, url: str, payload: dict) -> dict:
    try:
        import requests
        r = session.post(url, json=payload, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        return {'error': str(exc)}


def _post_multipart(session, url: str, frame_bytes: bytes, extra: dict | None = None) -> dict:
    try:
        import requests
        files = {'image': ('frame.jpg', io.BytesIO(frame_bytes), 'image/jpeg')}
        data  = extra or {}
        r = session.post(url, files=files, data=data, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        return {'error': str(exc)}


# ── Main demo ─────────────────────────────────────────────────────────────────

def run_demo(
    backend_url: str,
    ai_url: str,
    email: str,
    password: str,
    camera_id: int,
    rtsp_url: Optional[str] = None,
) -> DemoReport:
    try:
        import requests
    except ImportError:
        print('ERROR: pip install requests')
        sys.exit(1)

    from tests.integration.camera_simulator import CameraSimulator

    report  = DemoReport()
    session = requests.Session()
    bar     = '─' * 62

    print(f'\n{"="*62}')
    print(' CamTraffic — End-to-End Demo (Task 192)')
    print(f'{"="*62}')
    print(f'  Backend:  {backend_url}')
    print(f'  AI:       {ai_url}')
    print(f'  Camera:   #{camera_id}')
    print(f'{bar}\n')

    # ── Step 1: AI service health ─────────────────────────────────────────────
    t0 = time.perf_counter()
    ai_health = _get(session, f'{ai_url}/health/')
    elapsed   = (time.perf_counter() - t0) * 1000
    ok = 'error' not in ai_health
    report.add(Step('T183', 'AI service reachable', ok,
                    f'status={ai_health.get("status", "?")}', elapsed))

    # ── Step 2: Backend health ────────────────────────────────────────────────
    t0 = time.perf_counter()
    be_health = _get(session, f'{backend_url}/api/v1/health/')
    elapsed   = (time.perf_counter() - t0) * 1000
    ok = 'error' not in be_health
    report.add(Step('T184a', 'Backend reachable', ok,
                    f'status={be_health.get("status", "?")}', elapsed))

    # ── Step 3: Admin login ───────────────────────────────────────────────────
    t0 = time.perf_counter()
    login = _post_json(session, f'{backend_url}/api/v1/auth/login/',
                       {'email': email, 'password': password})
    elapsed = (time.perf_counter() - t0) * 1000
    token   = (login.get('data') or {}).get('tokens', {}).get('access', '')
    ok      = bool(token)
    session.headers['Authorization'] = f'Bearer {token}'
    report.add(Step('T184b', 'Admin login / JWT token', ok,
                    f'token_length={len(token)}', elapsed))

    if not ok:
        print('\n  ⚠️  Cannot continue without auth token — check credentials.')
        report.print_summary()
        return report

    # ── Step 4: Capture camera frame ──────────────────────────────────────────
    print(f'\n{bar}')
    t0 = time.perf_counter()
    with CameraSimulator(rtsp_url=rtsp_url) as cam:
        frames = list(cam.frames(max_frames=1, interval_s=0))
    elapsed = (time.perf_counter() - t0) * 1000
    frame = frames[0] if frames else b''
    ok = len(frame) > 10
    report.add(Step('T183', f'Frame captured ({cam.mode} mode)', ok,
                    f'size={len(frame)} bytes', elapsed))

    # ── Step 5: Submit frame to process-frame API ─────────────────────────────
    print(f'\n{bar}')
    t0  = time.perf_counter()
    url = f'{backend_url}/api/v1/integration/cameras/{camera_id}/process-frame/?sync=1'
    result = _post_multipart(session, url, frame)
    elapsed = (time.perf_counter() - t0) * 1000
    data = (result.get('data') or {})
    ok   = 'error' not in result and data.get('camera_id') == camera_id
    report.add(Step('T184', 'Frame submitted → process-frame API', ok,
                    f'detection_id={data.get("detection_id")} violation_id={data.get("violation_id")}',
                    elapsed))

    detection_id  = data.get('detection_id')
    violation_id  = data.get('violation_id')

    # ── Step 6: Verify detection saved (Task 185 + 187) ───────────────────────
    t0 = time.perf_counter()
    if detection_id:
        det = _get(session, f'{backend_url}/api/v1/detections/monitoring/{detection_id}/')
        ok  = 'error' not in det
        sign = (det.get('data') or {}).get('traffic_sign', {})
        elapsed = (time.perf_counter() - t0) * 1000
        report.add(Step('T185', 'AI traffic sign detection saved to DB', ok,
                        f'sign={sign.get("code", "none")}  conf={det.get("data", {}).get("confidence", 0):.0%}',
                        elapsed))
        report.add(Step('T187', 'Detection record in PostgreSQL', ok,
                        f'detection_id={detection_id}', elapsed))

        # Task 186 — OCR plate
        plate = (det.get('data') or {}).get('plate_number', '')
        report.add(Step('T186', 'OCR license plate read', bool(plate),
                        f'plate={plate or "(none)"}', elapsed))
    else:
        skipped = data.get('skipped', False)
        msg = 'No detections in test frame (AI mock not active).' if skipped else str(result.get('error', ''))
        for tid, name in [('T185', 'AI traffic sign detection'), ('T186', 'OCR plate'), ('T187', 'DB detection')]:
            report.add(Step(tid, name, False, msg, 0))

    # ── Step 7: Violation auto-created (Task 188) ─────────────────────────────
    ok = violation_id is not None
    report.add(Step('T188', 'Violation auto-created', ok,
                    f'violation_id={violation_id}', 0))

    # ── Step 8: Notifications (Task 189 + 190) ────────────────────────────────
    t0 = time.perf_counter()
    notifs = _get(session, f'{backend_url}/api/v1/notifications/')
    elapsed = (time.perf_counter() - t0) * 1000
    n_count = len((notifs.get('data') or {}).get('results', []))
    report.add(Step('T189', 'Officer notification in DB', n_count > 0,
                    f'notifications={n_count}', elapsed))
    officer_notified = data.get('officers_notified', 0) > 0
    driver_notified  = data.get('driver_notified', False)
    report.add(Step('T190', 'Driver notified of violation', driver_notified,
                    f'officers_notified={data.get("officers_notified", 0)}  driver_notified={driver_notified}',
                    elapsed))

    # ── Step 9: Report / dashboard data (Task 191) ────────────────────────────
    t0 = time.perf_counter()
    dash = _get(session, f'{backend_url}/api/v1/dashboard/stats/')
    elapsed = (time.perf_counter() - t0) * 1000
    total_v = (dash.get('data') or {}).get('total_violations', 0)
    total_d = (dash.get('data') or {}).get('total_detections', 0)
    ok = total_d >= 1
    report.add(Step('T191', 'Report / dashboard updated', ok,
                    f'total_detections={total_d}  total_violations={total_v}', elapsed))

    # ── Step 10: Full chain summary (Task 192) ────────────────────────────────
    chain_ok = all(s.passed for s in report.steps)
    report.add(Step('T192', 'Full E2E pipeline verified', chain_ok,
                    'All stages: camera → detection → violation → notification → dashboard',
                    sum(s.elapsed_ms for s in report.steps)))

    report.print_summary()
    return report


# ── CLI entry point ────────────────────────────────────────────────────────────

def _parse_args():
    import argparse
    p = argparse.ArgumentParser(description='CamTraffic E2E demo (Task 192)')
    p.add_argument('--backend',   default=DEFAULT_BACKEND)
    p.add_argument('--ai',        default=DEFAULT_AI)
    p.add_argument('--email',     default=DEFAULT_EMAIL)
    p.add_argument('--password',  default=DEFAULT_PASSWORD)
    p.add_argument('--camera-id', type=int, default=DEFAULT_CAMERA_ID, dest='camera_id')
    p.add_argument('--rtsp',      default=None, dest='rtsp_url',
                   help='Optional RTSP URL. Falls back to synthetic frame if not reachable.')
    return p.parse_args()


if __name__ == '__main__':
    args = _parse_args()
    report = run_demo(
        backend_url=args.backend,
        ai_url=args.ai,
        email=args.email,
        password=args.password,
        camera_id=args.camera_id,
        rtsp_url=args.rtsp_url,
    )
    sys.exit(0 if report.passed_count == report.total else 1)
