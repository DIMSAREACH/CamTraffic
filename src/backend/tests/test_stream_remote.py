"""Tests for Django → stream-gateway integration."""

import tempfile
from unittest.mock import patch

from django.test import TestCase, override_settings

from ai_detection.stream_remote_client import capture_snapshot_via_gateway


@override_settings(STREAM_GATEWAY_URL='http://localhost:8082')
class StreamRemoteClientTest(TestCase):
    @patch('ai_detection.stream_remote_client.httpx.Client')
    def test_capture_snapshot_via_gateway(self, mock_client_cls):
        mock_response = mock_client_cls.return_value.__enter__.return_value.get.return_value
        mock_response.raise_for_status.return_value = None
        mock_response.content = b'\xff\xd8\xff\xd9mock'

        data = capture_snapshot_via_gateway('cam-1', rtsp_url='rtsp://example')
        self.assertEqual(data, b'\xff\xd8\xff\xd9mock')

    @patch('ai_detection.stream_remote_client.capture_snapshot_via_gateway')
    def test_frame_capture_uses_gateway(self, mock_snapshot):
        from infrastructure.models import Camera, Road

        mock_snapshot.return_value = b'\xff\xd8\xff\xd9jpeg'
        road = Road.objects.create(name='Test Road')
        camera = Camera.objects.create(
            code='CAM-GW-1',
            name='Gateway Cam',
            road=road,
            frame_source_url='http://example.com/snapshot.jpg',
            status='active',
        )

        from ai_detection.frame_capture import capture_camera_frame

        path, fname = capture_camera_frame(camera.id)
        self.assertIsNotNone(path)
        self.assertTrue(fname.startswith('camera_'))
        mock_snapshot.assert_called_once()
        with open(path, 'rb') as fh:
            self.assertEqual(fh.read(), b'\xff\xd8\xff\xd9jpeg')
