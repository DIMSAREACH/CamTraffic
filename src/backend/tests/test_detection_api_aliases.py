"""Detection API aliases (/api/detection/*) match thesis checklist paths."""
from __future__ import annotations

import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

User = get_user_model()


def _tiny_jpeg() -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new('RGB', (64, 64), color=(200, 40, 40)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile('test.jpg', buf.read(), content_type='image/jpeg')


class DetectionApiAliasTests(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            email='detect-alias@test.kh',
            password='TestPass123!',
            role='police',
            first_name='Off',
            last_name='icer',
        )
        self.client.force_authenticate(user=self.officer)

    def test_detection_hub_lists_modes(self):
        res = self.client.get('/api/detection/')
        self.assertEqual(res.status_code, 200)
        data = res.json()['data']
        self.assertIn('modes', data)
        self.assertIn('image', data['modes'])
        self.assertIn('live', data['modes'])

    def test_detection_webcam_get_capabilities(self):
        res = self.client.get('/api/detection/webcam/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['data']['method'], 'POST')

    def test_detection_image_alias_matches_ai_detect(self):
        img = _tiny_jpeg()
        r1 = self.client.post('/api/detection/image/', {'image': img}, format='multipart')
        img2 = _tiny_jpeg()
        r2 = self.client.post('/api/ai/detect/', {'image': img2}, format='multipart')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        for res in (r1, r2):
            body = res.json()
            self.assertTrue(body.get('success'))
            self.assertIn('sign_name', body.get('data', {}))

    def test_api_catalog_for_officer(self):
        res = self.client.get('/api/catalog/')
        self.assertEqual(res.status_code, 200)
        cat = res.json()['data']
        self.assertIn('detection', cat)
        self.assertIn('detection_aliases', cat['modules'])

    def test_detection_webcam_post_accepts_image_frame(self):
        img = _tiny_jpeg()
        res = self.client.post('/api/detection/webcam/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))

    def test_unauthenticated_detection_hub_forbidden(self):
        self.client.force_authenticate(user=None)
        res = self.client.get('/api/detection/')
        self.assertEqual(res.status_code, 401)

    def test_detection_video_alias_accepts_video_field(self):
        img = _tiny_jpeg()
        res = self.client.post(
            '/api/detection/video/',
            {'video': img, 'file': img},
            format='multipart',
        )
        # Tiny JPEG is not a valid video container; expect 400 not 404/500.
        self.assertIn(res.status_code, (200, 400))
        if res.status_code == 400:
            self.assertFalse(res.json().get('success', True))

    def test_prd_detect_video_alias_exists(self):
        img = _tiny_jpeg()
        res = self.client.post(
            '/api/detect/video/',
            {'video': img, 'confidence': '0.5', 'enable_ocr': 'false', 'max_frames': '4'},
            format='multipart',
        )
        self.assertIn(res.status_code, (200, 400))
        self.assertNotEqual(res.status_code, 404)

    def test_prd_detections_list_alias(self):
        res = self.client.get('/api/detections/')
        self.assertEqual(res.status_code, 200)

    def test_detection_live_alias_accepts_image_frame(self):
        img = _tiny_jpeg()
        res = self.client.post('/api/detection/live/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))

    def test_master_build_ai_image_video_webcam_aliases(self):
        img = _tiny_jpeg()
        r_image = self.client.post('/api/ai/image/', {'image': img}, format='multipart')
        self.assertEqual(r_image.status_code, 200)
        self.assertTrue(r_image.json().get('success'))

        img2 = _tiny_jpeg()
        r_webcam = self.client.post('/api/ai/webcam/', {'image': img2}, format='multipart')
        self.assertEqual(r_webcam.status_code, 200)

        img3 = _tiny_jpeg()
        r_live = self.client.post('/api/ai/live-camera/', {'image': img3}, format='multipart')
        self.assertEqual(r_live.status_code, 200)

        r_hist = self.client.get('/api/ai/history/')
        self.assertEqual(r_hist.status_code, 200)

        r_stats = self.client.get('/api/ai/statistics/')
        self.assertEqual(r_stats.status_code, 200)

        r_models = self.client.get('/api/ai/models/')
        self.assertEqual(r_models.status_code, 200)
        self.assertIn('results', r_models.json().get('data', {}))

        catalog = self.client.get('/api/catalog/').json()['data']
        self.assertIn('master_build', catalog['detection'])
