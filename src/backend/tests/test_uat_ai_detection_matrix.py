"""Phase 10 UAT matrix — automated rows for thesis sign-off."""
from __future__ import annotations

import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from ai_detection.models import AIDetectionLog

User = get_user_model()


def _tiny_jpeg(name: str = 'uat-frame.jpg') -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new('RGB', (128, 128), color=(30, 120, 200)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


class UatAiDetectionMatrixTests(APITestCase):
    """Maps to docs/reports/AI-DETECTION-PHASE10-TEST-LOG.md manual + mode matrix."""

    def setUp(self):
        self.officer = User.objects.create_user(
            email='uat-ai@camtraffic.kh',
            password='TestPass123!',
            role='police',
            first_name='UAT',
            last_name='Officer',
        )
        self.client.force_authenticate(user=self.officer)
        self._logs_before = AIDetectionLog.objects.count()

    def test_uat_image_mode_api(self):
        res = self.client.post('/api/detection/image/', {'image': _tiny_jpeg()}, format='multipart')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body.get('success'))
        self.assertGreater(AIDetectionLog.objects.count(), self._logs_before)

    def test_uat_webcam_capabilities_and_frame_post(self):
        cap = self.client.get('/api/detection/webcam/')
        self.assertEqual(cap.status_code, 200)
        res = self.client.post('/api/detection/webcam/', {'image': _tiny_jpeg('webcam.jpg')}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))

    def test_uat_live_mode_image_frame(self):
        res = self.client.post('/api/detection/live/', {'image': _tiny_jpeg('live.jpg')}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))

    def test_uat_hub_catalog_stats_logs(self):
        self.assertEqual(self.client.get('/api/detection/').status_code, 200)
        self.assertEqual(self.client.get('/api/catalog/').status_code, 200)
        self.assertEqual(self.client.get('/api/ai/stats/').status_code, 200)
        self.assertEqual(self.client.get('/api/ai/logs/').status_code, 200)
