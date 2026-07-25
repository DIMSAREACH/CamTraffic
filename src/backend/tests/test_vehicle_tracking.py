"""Tests for ByteTrack vehicle tracking sessions."""
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from ai_detection.vehicle_tracking import (
    reset_track_session,
    track_vehicles,
    vehicle_tracking_enabled,
)


class VehicleTrackingTest(SimpleTestCase):
    def test_disabled_when_vehicle_detection_off(self):
        with override_settings(AI_VEHICLE_ENABLED=False, AI_VEHICLE_TRACKING_ENABLED=True):
            self.assertFalse(vehicle_tracking_enabled())
            self.assertEqual(track_vehicles('/tmp/road.jpg', 'sess-1'), [])

    @override_settings(AI_VEHICLE_ENABLED=True, AI_VEHICLE_TRACKING_ENABLED=False)
    def test_disabled_returns_empty(self):
        self.assertFalse(vehicle_tracking_enabled())
        self.assertEqual(track_vehicles('/tmp/road.jpg', 'sess-1'), [])

    @override_settings(AI_VEHICLE_ENABLED=True, AI_VEHICLE_TRACKING_ENABLED=True)
    @patch('ai_detection.vehicle_tracking.Path.is_file', return_value=True)
    @patch('ai_detection.vehicle_tracking._get_session_model')
    def test_track_assigns_ids(self, mock_get_model, _mock_is_file):
        mock_box = MagicMock()
        mock_box.cls.item.return_value = 2
        mock_box.conf.item.return_value = 0.88
        mock_box.id.item.return_value = 7
        mock_box.xyxy = [MagicMock()]
        mock_box.xyxy[0].tolist.return_value = [10.0, 20.0, 110.0, 120.0]

        mock_result = MagicMock()
        mock_result.orig_shape = (480, 640)
        mock_result.boxes = [mock_box]

        mock_model = MagicMock()
        mock_model.track.return_value = [mock_result]
        mock_get_model.return_value = mock_model

        detections = track_vehicles('/tmp/road.jpg', 'session-abc')

        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]['track_id'], 7)
        self.assertEqual(detections[0]['vehicle_type'], 'car')
        mock_model.track.assert_called_once()

    @override_settings(AI_VEHICLE_ENABLED=True, AI_VEHICLE_TRACKING_ENABLED=True)
    def test_reset_unknown_session_is_safe(self):
        reset_track_session('missing-session')
