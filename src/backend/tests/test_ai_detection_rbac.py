"""RBAC: operational AI endpoints are police/admin only."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AiDetectionRbacTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin-rbac@camtraffic.demo',
            password='pass12345',
            full_name='Admin RBAC',
            role='admin',
        )
        self.officer = User.objects.create_user(
            email='officer-rbac@camtraffic.demo',
            password='pass12345',
            full_name='Officer RBAC',
            role='police',
        )
        self.driver = User.objects.create_user(
            email='driver-rbac@camtraffic.demo',
            password='pass12345',
            full_name='Driver RBAC',
            role='driver',
        )
        self.png = SimpleUploadedFile(
            'sign.png',
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82',
            content_type='image/png',
        )

    def test_driver_blocked_from_detect(self):
        self.client.force_authenticate(user=self.driver)
        response = self.client.post('/api/ai/detect/', {'image': self.png}, format='multipart')
        self.assertEqual(response.status_code, 403)

    def test_driver_blocked_from_stats(self):
        self.client.force_authenticate(user=self.driver)
        response = self.client.get('/api/ai/stats/')
        self.assertEqual(response.status_code, 403)

    def test_driver_blocked_from_logs(self):
        self.client.force_authenticate(user=self.driver)
        response = self.client.get('/api/ai/logs/')
        self.assertEqual(response.status_code, 403)

    def test_officer_can_read_stats(self):
        self.client.force_authenticate(user=self.officer)
        response = self.client.get('/api/ai/stats/')
        self.assertEqual(response.status_code, 200)

    def test_admin_can_read_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/ai/stats/')
        self.assertEqual(response.status_code, 200)

    def test_officer_cannot_delete_log(self):
        from ai_detection.models import AIDetectionLog
        from django.core.files.base import ContentFile

        log = AIDetectionLog.objects.create(
            user=self.officer,
            detected_sign='NO_ENTRY',
            confidence=90.0,
            description='test',
        )
        log.uploaded_image.save('t.png', ContentFile(self.png.read()), save=True)
        self.png.seek(0)
        self.client.force_authenticate(user=self.officer)
        response = self.client.delete(f'/api/ai/logs/{log.id}/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(AIDetectionLog.objects.filter(pk=log.id).exists())

    def test_admin_can_delete_log(self):
        from ai_detection.models import AIDetectionLog
        from django.core.files.base import ContentFile

        log = AIDetectionLog.objects.create(
            user=self.officer,
            detected_sign='NO_ENTRY',
            confidence=90.0,
            description='test',
        )
        log.uploaded_image.save('t2.png', ContentFile(self.png.read()), save=True)
        self.png.seek(0)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/ai/logs/{log.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AIDetectionLog.objects.filter(pk=log.id).exists())
