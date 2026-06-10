"""Tests for YOLO COCO vehicle detection."""
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from ai_detection.vehicle_detection import (
    detect_vehicles,
    vehicle_detection_enabled,
)


class VehicleDetectionTest(SimpleTestCase):
    def test_disabled_returns_empty(self):
        with override_settings(AI_VEHICLE_ENABLED=False):
            self.assertFalse(vehicle_detection_enabled())
            self.assertEqual(detect_vehicles('/tmp/road.jpg'), [])

    @override_settings(AI_VEHICLE_ENABLED=True, AI_VEHICLE_CONFIDENCE_THRESHOLD=0.35)
    @patch('ai_detection.vehicle_detection.Path.exists', return_value=True)
    @patch('ai_detection.vehicle_detection._get_vehicle_model')
    def test_detects_coco_vehicles(self, mock_get_model, _mock_exists):
        mock_box_car = MagicMock()
        mock_box_car.cls.item.return_value = 2
        mock_box_car.conf.item.return_value = 0.91
        mock_box_car.xyxy = [MagicMock()]
        mock_box_car.xyxy[0].tolist.return_value = [10.0, 20.0, 110.0, 120.0]

        mock_box_moto = MagicMock()
        mock_box_moto.cls.item.return_value = 3
        mock_box_moto.conf.item.return_value = 0.76
        mock_box_moto.xyxy = [MagicMock()]
        mock_box_moto.xyxy[0].tolist.return_value = [200.0, 50.0, 280.0, 150.0]

        mock_result = MagicMock()
        mock_result.orig_shape = (480, 640)
        mock_result.boxes = [mock_box_car, mock_box_moto]

        mock_model = MagicMock()
        mock_model.predict.return_value = [mock_result]
        mock_get_model.return_value = mock_model

        detections = detect_vehicles('/tmp/road.jpg')

        self.assertEqual(len(detections), 2)
        self.assertEqual(detections[0]['vehicle_type'], 'car')
        self.assertEqual(detections[0]['label'], 'Car')
        self.assertEqual(detections[0]['confidence'], 91.0)
        self.assertEqual(detections[1]['vehicle_type'], 'motorcycle')
        mock_model.predict.assert_called_once()

    @override_settings(AI_VEHICLE_ENABLED=True)
    @patch('ai_detection.vehicle_detection.Path.exists', return_value=False)
    def test_missing_file_returns_empty(self, _mock_exists):
        self.assertEqual(detect_vehicles('/missing.jpg'), [])
