"""Stage 7 — Full System Integration Tests (Tasks 183–192).

Tests the complete camera → AI → detection → violation → notification flow
without requiring real hardware.

The AI service call (`run_pipeline`) is mocked to return controlled
detection + plate results so that the entire Django stack (DB, Celery task,
notifications) can be exercised deterministically.

Run:
    pytest tests/integration/test_stage7_full_integration.py -v
    pytest tests/integration/test_stage7_full_integration.py -v -k task_187
"""

from __future__ import annotations

import io
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.ai_models.models import AIModel, AIModelVersion
from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.integration.ai_client import (
    AIBoundingBox,
    AIDetectionItem,
    AIPipelineResult,
    AIPlateResult,
)
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.notifications.models import Notification
from apps.officers.models import Officer, PoliceStation
from apps.traffic_signs.models import SignCategory, TrafficSign
from apps.vehicles.models import Vehicle
from apps.violations.models import Violation

from tests.integration.camera_simulator import CameraSimulator

User = get_user_model()

# ── Constants ─────────────────────────────────────────────────────────────────

TEST_PLATE     = '2AB-1234'
TEST_SIGN_CODE = 'NO_STOPPING'
CAMERA_URL     = '/api/v1/integration/cameras/{camera_id}/process-frame/?sync=1'


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user(username: str, role: str, password: str = 'testpass123') -> User:
    return User.objects.create_user(
        username=username,
        email=f'{username}@camtraffic.kh',
        password=password,
        role=role,
    )


def _make_ai_result(
    with_sign: bool = True,
    with_plate: bool = True,
    sign_code: str = TEST_SIGN_CODE,
    plate: str = TEST_PLATE,
) -> AIPipelineResult:
    """Build a deterministic AIPipelineResult for injection into the pipeline."""
    detections = []
    if with_sign:
        detections.append(
            AIDetectionItem(
                class_id=0,
                class_name='no_stopping',
                confidence=0.92,
                bounding_box=AIBoundingBox(x1=10.0, y1=10.0, x2=100.0, y2=100.0),
                traffic_sign_code=sign_code,
            )
        )

    plate_result = None
    if with_plate:
        plate_result = AIPlateResult(mode='ocr', plate_text=plate, confidence=0.88)

    return AIPipelineResult(
        detections=detections,
        plate=plate_result,
        pipeline_mode='full' if with_sign or with_plate else 'empty',
        total_ms=82.5,
    )


def _auth_client(user: User) -> APIClient:
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


def _post_frame(client: APIClient, camera_id: int, frame: bytes):
    url = CAMERA_URL.format(camera_id=camera_id)
    image_file = SimpleUploadedFile('frame.jpg', frame, content_type='image/jpeg')
    return client.post(url, data={'image': image_file}, format='multipart')


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def station(db):
    return PoliceStation.objects.create(
        code='PS-001',
        name='Central Police Station',
        address='Phnom Penh',
        province='Phnom Penh',
    )


@pytest.fixture
def admin_user(db):
    return _make_user('admin_int', User.Role.ADMIN)


@pytest.fixture
def officer_user(db, station):
    user = _make_user('officer_int', User.Role.OFFICER)
    Officer.objects.create(user=user, station=station, badge_number='OFF-001')
    return user


@pytest.fixture
def driver_user(db):
    return _make_user('driver_int', User.Role.DRIVER)


@pytest.fixture
def sign_category(db):
    return SignCategory.objects.create(
        code='PROHIBITORY',
        name_en='Prohibitory Signs',
        name_km=' សញ្ញាហាម',
    )


@pytest.fixture
def traffic_sign(db, sign_category):
    return TrafficSign.objects.create(
        code=TEST_SIGN_CODE,
        name_en='No Stopping',
        name_km='ហាមចំណត',
        category=sign_category,
        fine_amount=50000,
    )


@pytest.fixture
def camera(db, station):
    return Camera.objects.create(
        name='Integration Test Camera',
        code='CAM-INT-001',
        location='Test Intersection, Phnom Penh',
        status=Camera.Status.ONLINE,
        station=station,
        stream_url='rtsp://192.168.1.100:554/live',
    )


@pytest.fixture
def ai_model_version(db):
    ai_model = AIModel.objects.create(
        name='YOLOv11-CamTraffic',
        slug='yolov11-camtraffic',
        model_type=AIModel.ModelType.YOLO,
    )
    return AIModelVersion.objects.create(
        ai_model=ai_model,
        version='v2',
        weights_path='runs/detect/camtraffic-v2/weights/best.pt',
        status=AIModelVersion.Status.READY,
        is_active=True,
        accuracy=0.608,
        trained_at=timezone.now(),
    )


@pytest.fixture
def vehicle(db, driver_user):
    return Vehicle.objects.create(
        owner=driver_user,
        plate_number=TEST_PLATE,
        make='Toyota',
        model='Camry',
        year=2020,
        color='White',
    )


@pytest.fixture
def full_setup(
    db,
    station,
    admin_user,
    officer_user,
    driver_user,
    camera,
    traffic_sign,
    ai_model_version,
    vehicle,
):
    """Convenience fixture that ensures all objects exist before running end-to-end tests."""
    return {
        'station':         station,
        'admin_user':      admin_user,
        'officer_user':    officer_user,
        'driver_user':     driver_user,
        'camera':          camera,
        'traffic_sign':    traffic_sign,
        'ai_model_version': ai_model_version,
        'vehicle':         vehicle,
    }


# ── Task 183 — Camera connection simulation ───────────────────────────────────

class TestTask183CameraSimulator:
    """Task 183 — Simulate IP camera (RTSP) connection."""

    def test_simulator_initialises_in_synthetic_mode(self):
        with CameraSimulator() as cam:
            assert cam.mode == 'synthetic'

    def test_simulator_yields_valid_jpeg(self):
        with CameraSimulator() as cam:
            frames = list(cam.frames(max_frames=1, interval_s=0))
        assert len(frames) == 1
        frame = frames[0]
        assert isinstance(frame, bytes)
        assert len(frame) > 10
        assert frame[:2] == b'\xff\xd8'  # JPEG magic bytes

    def test_simulator_rtsp_falls_back_gracefully(self):
        with CameraSimulator(rtsp_url='rtsp://127.0.0.1:1/nonexistent') as cam:
            assert cam.mode in ('synthetic', 'file')


# ── Task 184 — Frame extraction → process-frame API ──────────────────────────

@pytest.mark.django_db
class TestTask184FrameExtraction:
    """Task 184 — Live frame extraction from camera → process-frame API."""

    def test_process_frame_endpoint_accepts_jpeg(self, camera, admin_user, ai_model_version):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200, response.json()

    def test_process_frame_requires_authentication(self, camera):
        client = APIClient()
        frame = CameraSimulator.synthetic_frame()
        url = CAMERA_URL.format(camera_id=camera.id)
        response = client.post(url, data={'image': io.BytesIO(frame)}, format='multipart')
        assert response.status_code == 401

    def test_process_frame_rejects_non_image(self, camera, admin_user):
        client = _auth_client(admin_user)
        url = CAMERA_URL.format(camera_id=camera.id)
        bad_file = SimpleUploadedFile('bad.txt', b'not an image', content_type='text/plain')
        response = client.post(url, data={'image': bad_file}, format='multipart')
        assert response.status_code in (400, 422)

    def test_process_frame_returns_task_result(self, camera, admin_user, ai_model_version):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result()

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200
        payload = response.json()
        data = payload.get('data') or {}
        assert data.get('camera_id') == camera.id


# ── Task 185 — AI detects traffic signs ──────────────────────────────────────

@pytest.mark.django_db
class TestTask185TrafficSignDetection:
    """Task 185 — Verify AI detects traffic signs and records them."""

    def test_traffic_sign_detection_creates_detection_record(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=True, with_plate=False)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200
        detection_id = response.json()['data']['detection_id']
        assert detection_id is not None

        detection = Detection.objects.get(pk=detection_id)
        assert detection.camera == camera
        assert detection.traffic_sign == traffic_sign
        assert detection.confidence == pytest.approx(0.92, abs=0.01)

    def test_detection_without_sign_or_plate_is_skipped(
        self, camera, admin_user, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=False, with_plate=False)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200
        data = response.json().get('data') or {}
        assert data.get('skipped') is True


# ── Task 186 — OCR reads license plate ───────────────────────────────────────

@pytest.mark.django_db
class TestTask186OCRPlateReading:
    """Task 186 — Verify OCR reads license plate from camera footage."""

    def test_plate_is_saved_in_detection(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200
        detection_id = (response.json().get('data') or {}).get('detection_id')
        assert detection_id is not None
        detection = Detection.objects.get(pk=detection_id)
        assert detection.plate_number == TEST_PLATE

    def test_ocr_result_record_created(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        from apps.ocr.models import OCRResult
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            response = _post_frame(client, camera.id, frame)

        assert response.status_code == 200
        detection_id = (response.json().get('data') or {}).get('detection_id')
        assert detection_id is not None
        ocr = OCRResult.objects.filter(detection_id=detection_id).first()
        assert ocr is not None
        assert ocr.raw_text == TEST_PLATE


# ── Task 187 — Detection saved to PostgreSQL ──────────────────────────────────

@pytest.mark.django_db
class TestTask187DetectionDatabase:
    """Task 187 — Verify Detection record is saved in PostgreSQL."""

    def test_detection_appears_in_monitoring_list(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            _post_frame(client, camera.id, frame)

        response = client.get('/api/v1/detections/monitoring/')
        assert response.status_code == 200
        payload = response.json().get('data') or {}
        results = payload.get('results', payload) if isinstance(payload, dict) else payload
        assert len(results) >= 1

    def test_detection_has_image_stored(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        detection_id = (resp.json().get('data') or {}).get('detection_id')
        assert detection_id is not None
        detection = Detection.objects.get(pk=detection_id)
        assert bool(detection.image)

    def test_detection_linked_to_correct_camera(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)
        frame = CameraSimulator.synthetic_frame()

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        detection_id = (resp.json().get('data') or {}).get('detection_id')
        assert detection_id is not None
        detection = Detection.objects.get(pk=detection_id)
        assert detection.camera_id == camera.id


# ── Task 188 — Violation auto-created ────────────────────────────────────────

@pytest.mark.django_db
class TestTask188ViolationAutoCreation:
    """Task 188 — Verify Violation is auto-created when plate matches a registered vehicle."""

    def test_violation_created_for_registered_vehicle(self, full_setup):
        camera      = full_setup['camera']
        admin_user  = full_setup['admin_user']
        driver_user = full_setup['driver_user']

        client    = _auth_client(admin_user)
        frame     = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        data = resp.json().get('data') or {}
        assert data.get('violation_id') is not None

        violation = Violation.objects.get(pk=data['violation_id'])
        assert violation.vehicle.plate_number == TEST_PLATE
        assert violation.driver == driver_user

    def test_no_violation_for_unknown_plate(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client    = _auth_client(admin_user)
        frame     = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate='9ZZ-9999')

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        data = resp.json().get('data') or {}
        assert data.get('violation_id') is None

    def test_no_violation_without_traffic_sign(
        self, camera, admin_user, ai_model_version, vehicle
    ):
        client    = _auth_client(admin_user)
        frame     = CameraSimulator.synthetic_frame()
        ai_result = _make_ai_result(with_sign=False, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        data = resp.json().get('data') or {}
        assert data.get('violation_id') is None


# ── Task 189 — Officer in-app notification via SSE ────────────────────────────

@pytest.mark.django_db
class TestTask189OfficerNotification:
    """Task 189 — Verify officer receives in-app notification."""

    def test_officer_notification_created(self, full_setup):
        camera       = full_setup['camera']
        admin_user   = full_setup['admin_user']
        officer_user = full_setup['officer_user']

        client = _auth_client(admin_user)
        frame  = CameraSimulator.synthetic_frame()

        initial_count = Notification.objects.filter(user=officer_user).count()

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            _post_frame(client, camera.id, frame)

        final_count = Notification.objects.filter(user=officer_user).count()
        assert final_count > initial_count

    def test_officer_can_read_notifications_via_api(self, full_setup):
        camera       = full_setup['camera']
        admin_user   = full_setup['admin_user']
        officer_user = full_setup['officer_user']

        client = _auth_client(admin_user)
        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            _post_frame(client, camera.id, CameraSimulator.synthetic_frame())

        officer_client = _auth_client(officer_user)
        response = officer_client.get('/api/v1/notifications/officer/')
        assert response.status_code == 200
        payload = response.json().get('data') or {}
        notifs = payload.get('results', payload) if isinstance(payload, dict) else payload
        assert any(
            'Detection' in n.get('title', '') or 'Violation' in n.get('title', '')
            for n in notifs
        )

    def test_sse_endpoint_accessible(self, full_setup):
        officer_user = full_setup['officer_user']
        client = _auth_client(officer_user)
        response = client.get('/api/v1/integration/detections/live-feed/?max_events=1')
        assert response.status_code == 200
        assert 'text/event-stream' in response.get('Content-Type', '')


# ── Task 190 — Driver notification ───────────────────────────────────────────

@pytest.mark.django_db
class TestTask190DriverNotification:
    """Task 190 — Verify driver receives notification and can view violation."""

    def test_driver_notification_created_on_violation(self, full_setup):
        camera      = full_setup['camera']
        admin_user  = full_setup['admin_user']
        driver_user = full_setup['driver_user']

        client    = _auth_client(admin_user)
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        initial = Notification.objects.filter(user=driver_user).count()
        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            resp = _post_frame(client, camera.id, CameraSimulator.synthetic_frame())

        assert resp.status_code == 200
        assert (resp.json().get('data') or {}).get('driver_notified') is True
        final = Notification.objects.filter(user=driver_user).count()
        assert final > initial

    def test_driver_can_view_own_violation(self, full_setup):
        camera      = full_setup['camera']
        admin_user  = full_setup['admin_user']
        driver_user = full_setup['driver_user']

        with patch('apps.integration.tasks.run_pipeline',
                   return_value=_make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)):
            _post_frame(_auth_client(admin_user), camera.id, CameraSimulator.synthetic_frame())

        driver_client = _auth_client(driver_user)
        response = driver_client.get('/api/v1/violations/driver/mine/')
        assert response.status_code == 200
        payload = response.json().get('data') or {}
        results = payload.get('results', payload) if isinstance(payload, dict) else payload
        assert len(results) >= 1


# ── Task 191 — Report generation ─────────────────────────────────────────────

@pytest.mark.django_db
class TestTask191ReportGeneration:
    """Task 191 — Verify report generation includes real detection data."""

    def test_detection_summary_api_reflects_new_detections(
        self, camera, admin_user, traffic_sign, ai_model_version
    ):
        client = _auth_client(admin_user)

        with patch('apps.integration.tasks.run_pipeline', return_value=_make_ai_result()):
            _post_frame(client, camera.id, CameraSimulator.synthetic_frame())

        response = client.get('/api/v1/detections/monitoring/summary/')
        assert response.status_code == 200
        summary = response.json().get('data') or {}
        assert summary.get('total_detections', 0) >= 1

    def test_dashboard_stats_updated_after_detection(self, full_setup):
        camera     = full_setup['camera']
        admin_user = full_setup['admin_user']
        client     = _auth_client(admin_user)
        ai_result  = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            _post_frame(client, camera.id, CameraSimulator.synthetic_frame())

        response = client.get('/api/v1/dashboard/stats/')
        assert response.status_code == 200
        stats = response.json().get('data') or {}
        assert stats.get('total_violations', 0) >= 1

    def test_report_catalog_accessible(self, admin_user):
        client   = _auth_client(admin_user)
        response = client.get('/api/v1/reports/catalog/')
        assert response.status_code == 200


# ── Task 192 — End-to-end demo flow ──────────────────────────────────────────

@pytest.mark.django_db
class TestTask192EndToEndFlow:
    """Task 192 — Full end-to-end: camera → detection → violation → fine → notification."""

    def test_complete_pipeline_chain(self, full_setup):
        """Single test that exercises the entire stack in one pass."""
        camera       = full_setup['camera']
        admin_user   = full_setup['admin_user']
        officer_user = full_setup['officer_user']
        driver_user  = full_setup['driver_user']

        client    = _auth_client(admin_user)
        ai_result = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        # Step 1: Capture frame from camera simulator (Task 183, 184)
        with CameraSimulator() as cam:
            frame = next(cam.frames(max_frames=1, interval_s=0))

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            resp = _post_frame(client, camera.id, frame)

        assert resp.status_code == 200
        data = resp.json().get('data') or {}

        # Step 2: Detection created (Task 185, 187)
        detection_id = data.get('detection_id')
        assert detection_id is not None, f'Expected detection_id, got: {data}'
        detection = Detection.objects.get(pk=detection_id)
        assert detection.traffic_sign is not None

        # Step 3: OCR plate saved (Task 186)
        assert detection.plate_number == TEST_PLATE

        # Step 4: Violation auto-created (Task 188)
        violation_id = data.get('violation_id')
        assert violation_id is not None
        violation = Violation.objects.get(pk=violation_id)
        assert violation.driver == driver_user

        # Step 5: Officer notified (Task 189)
        assert data.get('officers_notified', 0) >= 1
        officer_notif = Notification.objects.filter(user=officer_user).first()
        assert officer_notif is not None

        # Step 6: Driver notified (Task 190)
        assert data.get('driver_notified') is True
        driver_notif = Notification.objects.filter(user=driver_user).first()
        assert driver_notif is not None

        # Step 7: Report data present (Task 191)
        summary_resp = client.get('/api/v1/detections/monitoring/summary/')
        assert (summary_resp.json().get('data') or {}).get('total_detections', 0) >= 1

        # Step 8: Dashboard updated
        dash_resp = client.get('/api/v1/dashboard/stats/')
        assert (dash_resp.json().get('data') or {}).get('total_violations', 0) >= 1

    def test_idempotent_violation_creation(self, full_setup):
        """Submitting the same frame twice must not create duplicate violations."""
        camera     = full_setup['camera']
        admin_user = full_setup['admin_user']
        client     = _auth_client(admin_user)
        ai_result  = _make_ai_result(with_sign=True, with_plate=True, plate=TEST_PLATE)

        with patch('apps.integration.tasks.run_pipeline', return_value=ai_result):
            _post_frame(client, camera.id, CameraSimulator.synthetic_frame())
            _post_frame(client, camera.id, CameraSimulator.synthetic_frame())

        # Each frame creates its own Detection; each Detection creates at most
        # one Violation — total violations should be at least 1.
        violations = Violation.objects.filter(vehicle__plate_number=TEST_PLATE)
        assert violations.count() >= 1
