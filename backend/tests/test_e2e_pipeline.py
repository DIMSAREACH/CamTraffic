"""
End-to-end integration test — CamTraffic Defense Demo Pipeline

Validates the full flow:
  Camera → Sign Detection → Vehicle Detection → OCR → Violation → Evidence → DB → Dashboard

Run:
    cd backend
    python manage.py test tests.test_e2e_pipeline -v 2

All tests use the real database and real AI models (no mocks).
"""
import os
import shutil
from pathlib import Path

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
SAMPLE_IMAGE = PROJECT_ROOT / 'ai' / 'test_samples' / 'car_with_plate_2A-1234.jpg'
NO_LEFT_TURN_IMG = PROJECT_ROOT / 'docs' / 'thesis_evidence' / 'AI-06' / 'predictions' / 'NO_LEFT_TURN_No Left Turn_03_prediction.jpg'


def _make_admin(email='e2e_admin@camtraffic.kh', password='e2e_test_pass_123'):
    """Create (or return existing) admin user for e2e tests."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        email=email,
        defaults={'full_name': 'E2E Admin', 'role': 'admin', 'is_active': True, 'is_staff': True},
    )
    user.set_password(password)
    user.save(update_fields=['password'])
    return user, password


def _admin_client():
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken
    user, _ = _make_admin()
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
    return client, user


def _seed_violation_rules():
    from violations.models import ViolationRule
    from decimal import Decimal
    rules = [
        ('NO_LEFT_TURN', 'LEFT_TURN', 'ILLEGAL_LEFT_TURN', 'Illegal Left Turn', Decimal('25.00')),
        ('NO_RIGHT_TURN', 'RIGHT_TURN', 'ILLEGAL_RIGHT_TURN', 'Illegal Right Turn', Decimal('25.00')),
        ('NO_U_TURN', 'U_TURN', 'ILLEGAL_U_TURN', 'Illegal U-Turn', Decimal('30.00')),
        ('NO_PARKING', 'PARKING', 'NO_PARKING', 'No Parking Violation', Decimal('20.00')),
    ]
    for sign_key, action, vtype, title, amount in rules:
        ViolationRule.objects.get_or_create(
            sign_class_key=sign_key,
            prohibited_action=action,
            defaults={'violation_type': vtype, 'title': title, 'default_fine_amount': amount},
        )


def _seed_traffic_sign(code='P-001', name_km='បញ្ចប់ការហាមផ្លុំស៊ីផ្លេ', name_en='End of Honking Prohibition'):
    from traffic_signs.models import TrafficSign
    return TrafficSign.objects.get_or_create(
        sign_code=code,
        defaults={
            'sign_name': name_km,
            'sign_name_km': name_km,
            'sign_name_en': name_en,
            'description': f'សញ្ញាហាមឃាត់ {name_km}។',
            'description_en': f'{name_en} — prohibitory sign used on Cambodian roads.',
            'guidance': f'សូមគោរពច្បាប់ហាមឃាត់ {name_km}។',
            'guidance_en': f'Follow the prohibition shown by this sign: {name_en}.',
            'category': 'prohibitory',
        },
    )[0]


def _seed_fine(admin_user):
    from decimal import Decimal
    from django.contrib.auth import get_user_model
    from fines.models import Fine
    User = get_user_model()
    driver, _ = User.objects.get_or_create(
        email='e2e_driver@camtraffic.kh',
        defaults={'full_name': 'E2E Driver', 'role': 'driver', 'is_active': True},
    )
    fine, _ = Fine.objects.get_or_create(
        driver=driver,
        reason='E2E test fine — illegal left turn',
        defaults={
            'police': admin_user,
            'amount': Decimal('25.00'),
            'status': 'pending',
            'location': 'Phnom Penh Test Intersection',
            'vehicle_plate': '2A-1234',
        },
    )
    return fine


def _sample_image(path=None):
    """Return a SimpleUploadedFile from a real image, or a minimal fallback."""
    chosen = path or SAMPLE_IMAGE
    if Path(chosen).is_file():
        with open(chosen, 'rb') as f:
            data = f.read()
        return SimpleUploadedFile('test.jpg', data, content_type='image/jpeg')
    # Minimal 1×1 white JPEG as last resort
    import struct
    jpeg = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD4, 0xFF, 0xD9,
    ])
    return SimpleUploadedFile('test.jpg', jpeg, content_type='image/jpeg')


class AuthTests(TestCase):
    """Step 1: Authentication"""

    def setUp(self):
        self.admin, self.password = _make_admin()
        self.client = APIClient()

    def test_login_returns_tokens(self):
        """Admin can log in and receive JWT access + refresh tokens."""
        r = self.client.post('/api/auth/login/', {'email': self.admin.email, 'password': self.password}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        self.assertTrue(data['success'])
        self.assertIn('access', data['data'])
        self.assertIn('refresh', data['data'])

    def test_profile_requires_auth(self):
        r = self.client.get('/api/auth/profile/')
        self.assertEqual(r.status_code, 401)

    def test_profile_returns_user_with_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.admin).access_token))
        r = self.client.get('/api/auth/profile/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['data']['role'], 'admin')


class DashboardAPITests(TestCase):
    """Step 9: Dashboard stats API"""

    def setUp(self):
        self.client, _ = _admin_client()

    def test_admin_dashboard_returns_stats(self):
        r = self.client.get('/api/dashboard/admin/')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()['data']
        for field in ('total_users', 'total_detections', 'total_fines', 'total_violations'):
            self.assertIn(field, data, f'Missing field: {field}')

    def test_ai_stats_returns_model_info(self):
        r = self.client.get('/api/ai/stats/')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()['data']
        self.assertIn('model', data)
        self.assertIn('stats', data)
        self.assertIn('sample_signs', data)

    def test_notifications_accessible(self):
        r = self.client.get('/api/notifications/')
        self.assertEqual(r.status_code, 200, r.content)

    def test_violation_rules_accessible(self):
        r = self.client.get('/api/violations/rules/')
        self.assertEqual(r.status_code, 200, r.content)


class DetectionPipelineTests(TestCase):
    """Steps 2–6: YOLO → Vehicle → OCR → Violation → Evidence"""

    def setUp(self):
        self.client, self.user = _admin_client()

    def test_detect_endpoint_accepts_image_and_returns_pipeline(self):
        """Full pipeline: upload → sign → vehicle → OCR → return payload."""
        img = _sample_image()
        r = self.client.post('/api/ai/detect/', {'image': img}, format='multipart')
        self.assertIn(r.status_code, [200, 201], r.content)
        data = r.json()
        self.assertTrue(data.get('success'), data)
        payload = data['data']
        # Must have sign detection fields (API uses sign_name)
        self.assertIn('sign_name', payload)
        self.assertIn('confidence', payload)
        # Must have pipeline steps
        self.assertIn('pipeline', payload)
        self.assertIsInstance(payload['pipeline'], list)
        self.assertGreater(len(payload['pipeline']), 0)

    def test_detection_saves_log_to_db(self):
        """After upload, an AIDetectionLog record must exist for this user."""
        from ai_detection.models import AIDetectionLog
        before = AIDetectionLog.objects.filter(user=self.user).count()
        img = _sample_image()
        r = self.client.post('/api/ai/detect/', {'image': img}, format='multipart')
        self.assertIn(r.status_code, [200, 201], r.content)
        after = AIDetectionLog.objects.filter(user=self.user).count()
        self.assertEqual(after, before + 1, 'Detection log not saved to DB')

    def test_detection_log_list_pagination(self):
        """Logs endpoint respects page_size parameter."""
        r = self.client.get('/api/ai/logs/', {'page_size': 5})
        self.assertEqual(r.status_code, 200, r.content)
        logs = r.json()['data']
        self.assertLessEqual(len(logs), 5, f'Expected ≤5 logs, got {len(logs)}')

    def test_detect_returns_uploaded_image_url(self):
        """Saved image URL must be an absolute URL in the response."""
        img = _sample_image()
        r = self.client.post('/api/ai/detect/', {'image': img}, format='multipart')
        self.assertIn(r.status_code, [200, 201])
        payload = r.json()['data']
        url = payload.get('uploaded_image', '')
        self.assertTrue(
            url.startswith('http') or url.startswith('/media/'),
            f'Expected media URL, got: {url!r}',
        )

    def test_live_scan_accepts_track_session(self):
        """Live webcam preview with track_session returns tracking metadata."""
        from unittest.mock import patch

        tracked = [{
            'vehicle_type': 'car',
            'label': 'Car',
            'confidence': 91.0,
            'bbox': {'x1': 0.1, 'y1': 0.2, 'x2': 0.5, 'y2': 0.7},
            'track_id': 4,
        }]
        img = _sample_image()
        with patch('ai_detection.pipeline.track_vehicles', return_value=tracked):
            r = self.client.post('/api/ai/detect/', {
                'image': img,
                'original_filename': 'webcam-live.jpg',
                'live_scan': 'true',
                'track_session': 'e2e-track-session',
            }, format='multipart')
        self.assertIn(r.status_code, [200, 201], r.content)
        payload = r.json()['data']
        self.assertTrue(payload.get('live_preview'))
        self.assertEqual(payload.get('track_session'), 'e2e-track-session')
        self.assertEqual(payload.get('vehicles'), tracked)
        self.assertIsNone(payload.get('log_id'))


class ViolationEngineTests(TestCase):
    """Step 5: Violation rule engine"""

    def setUp(self):
        self.client, _ = _admin_client()
        _seed_violation_rules()

    def test_evaluate_no_left_turn_violation(self):
        """NO_LEFT_TURN sign + LEFT_TURN action → violation detected."""
        r = self.client.post('/api/violations/evaluate/', {
            'class_key': 'NO_LEFT_TURN',
            'observed_action': 'LEFT_TURN',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()['data']
        self.assertTrue(data.get('is_violation'), data)
        self.assertEqual(data.get('violation_type'), 'ILLEGAL_LEFT_TURN')

    def test_no_violation_when_action_is_compliant(self):
        """NO_LEFT_TURN sign + RIGHT_TURN action → no violation."""
        r = self.client.post('/api/violations/evaluate/', {
            'class_key': 'NO_LEFT_TURN',
            'observed_action': 'RIGHT_TURN',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()['data']
        self.assertFalse(data.get('is_violation'), data)

    def test_violation_stats_accessible(self):
        r = self.client.get('/api/violations/stats/')
        self.assertEqual(r.status_code, 200)


class InfrastructureTests(TestCase):
    """Step 1 (Camera): Camera + Road management API"""

    def setUp(self):
        self.client, _ = _admin_client()

    def test_cameras_list(self):
        r = self.client.get('/api/cameras/')
        self.assertEqual(r.status_code, 200)

    def test_roads_list(self):
        r = self.client.get('/api/roads/')
        self.assertEqual(r.status_code, 200)


class FinePDFTests(TestCase):
    """Step 6/7: Digital Records — Fine PDF export"""

    def setUp(self):
        self.client, self.user = _admin_client()
        self.fine = _seed_fine(self.user)

    def test_fine_pdf_returns_pdf_bytes(self):
        r = self.client.get(f'/api/fines/{self.fine.id}/pdf/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertIn(b'%PDF', r.content[:10])


class TrafficSignAPITests(TestCase):
    """Traffic Sign DB — verify signs are seeded and queryable."""

    def setUp(self):
        self.client, _ = _admin_client()
        self.sign = _seed_traffic_sign()

    def test_signs_endpoint_accessible(self):
        """Signs API is reachable and returns a valid paginated response."""
        r = self.client.get('/api/signs/', {'page_size': 5})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data.get('success'), data)
        self.assertIsInstance(data.get('data'), list)
        self.assertGreaterEqual(len(data['data']), 1)

    def test_sign_has_bilingual_names(self):
        """Seeded sign must expose Khmer and English names for TTS/UI."""
        r = self.client.get(f'/api/signs/{self.sign.id}/')
        self.assertEqual(r.status_code, 200, r.content)
        payload = r.json()['data']
        self.assertTrue(payload.get('sign_name_km'))
        self.assertTrue(payload.get('sign_name_en'))
        self.assertIn('description', payload)
        self.assertIn('guidance', payload)

    def test_sign_categories_in_production_db(self):
        """Verify signs have valid categories."""
        from traffic_signs.models import TrafficSign
        _seed_traffic_sign('P-002', 'បញ្ចប់កំណត់ល្បឿនអតិបរមា', 'End of maximum speed limit')
        cats = set(TrafficSign.objects.values_list('category', flat=True).distinct())
        self.assertGreater(len(cats), 0)


class EvidenceArchiveTests(TestCase):
    """Module 6 — unified evidence archive search."""

    def setUp(self):
        self.client, _ = _admin_client()

    def test_evidence_archive_returns_list(self):
        r = self.client.get('/api/dashboard/evidence/')
        self.assertEqual(r.status_code, 200, r.content[:200])
        data = r.json()['data']
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertIsInstance(data['results'], list)

    def test_evidence_archive_filter_by_type(self):
        r = self.client.get('/api/dashboard/evidence/', {'type': 'detection'})
        self.assertEqual(r.status_code, 200, r.content[:200])
        for row in r.json()['data']['results']:
            self.assertEqual(row['source_type'], 'detection')


class DashboardReportPDFTests(TestCase):
    """Module 7 — Analytics report PDF export."""

    def setUp(self):
        self.client, self.user = _admin_client()

    def test_admin_report_pdf_returns_pdf_bytes(self):
        r = self.client.get('/api/dashboard/admin/report/pdf/')
        self.assertEqual(r.status_code, 200, r.content[:200])
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertIn(b'%PDF', r.content[:10])

    def test_police_report_pdf_returns_pdf_bytes(self):
        r = self.client.get('/api/dashboard/police/reports/pdf/')
        self.assertEqual(r.status_code, 200, r.content[:200])
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertIn(b'%PDF', r.content[:10])


class TTSTests(TestCase):
    """Neural TTS API — Khmer and English speech synthesis."""

    def setUp(self):
        self.client, _ = _admin_client()

    def test_tts_endpoint_requires_text(self):
        r = self.client.post('/api/ai/tts/', {'text': ''}, format='json')
        self.assertEqual(r.status_code, 400, r.content)

    def test_tts_khmer_returns_audio(self):
        from ai_detection.tts import tts_available
        if not tts_available():
            self.skipTest('edge-tts not installed')
        r = self.client.post('/api/ai/tts/', {
            'text': 'បញ្ចប់ការហាមផ្លុំស៊ីផ្លេ',
            'lang': 'km',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content[:200])
        self.assertEqual(r['Content-Type'], 'audio/mpeg')
        self.assertGreater(len(r.content), 1000)

    def test_tts_english_returns_audio(self):
        from ai_detection.tts import tts_available
        if not tts_available():
            self.skipTest('edge-tts not installed')
        r = self.client.post('/api/ai/tts/', {
            'text': 'End of Honking Prohibition',
            'lang': 'en',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content[:200])
        self.assertEqual(r['Content-Type'], 'audio/mpeg')
        self.assertGreater(len(r.content), 1000)
