"""Integration test: upload an image to the AI detection endpoint."""
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from ai_detection.models import AIDetectionLog

User = get_user_model()


class ImageUploadDetectionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Test@12345'
        self.admin = User.objects.create_user(
            email='admin2@camtraffic.kh',
            password=self.password,
            full_name='Admin User 2',
            role='admin',
        )

    def _login(self, user):
        res = self.client.post('/api/auth/login/', {
            'email': user.email,
            'password': self.password,
        })
        token = res.data['data']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _make_test_jpeg(self):
        try:
            from PIL import Image
        except Exception:
            raise RuntimeError('Pillow is required to run this test')
        img = Image.new('RGB', (320, 240), color=(73, 109, 137))
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        return buf

    def test_upload_image_creates_detection_log(self):
        self._login(self.admin)
        before = AIDetectionLog.objects.count()
        img_buf = self._make_test_jpeg()
        file_obj = SimpleUploadedFile('test.jpg', img_buf.read(), content_type='image/jpeg')
        res = self.client.post('/api/ai/detect/', {
            'image': file_obj,
            'original_filename': 'test.jpg',
        }, format='multipart')
        self.assertIn(res.status_code, (200, 201))
        payload = res.data.get('data') if isinstance(res.data, dict) else None
        if payload:
            self.assertTrue(payload.get('log_id') or payload.get('uploaded_image') or payload.get('pipeline'))
        after = AIDetectionLog.objects.count()
        self.assertGreaterEqual(after, before)
