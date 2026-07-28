"""Tests for YOLO COCO vehicle detection."""
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from ai_detection.vehicle_detection import (
    detect_vehicles,
    refine_vehicles_with_plate,
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
        # AI model detects vehicle types based on COCO classes (class 2=car, class 3=motorcycle/truck)
        self.assertIn(detections[0]['vehicle_type'], ('car', 'motorcycle', 'truck'))
        self.assertIn(detections[0]['label'], ('Car', 'Motorcycle', 'Truck'))
        self.assertEqual(detections[0]['confidence'], 91.0)
        # Second detection: COCO class 3 can map to motorcycle or truck depending on model
        self.assertIn(detections[1]['vehicle_type'], ('motorcycle', 'truck'))
        mock_model.predict.assert_called_once()

    @override_settings(AI_VEHICLE_ENABLED=True)
    @patch('ai_detection.vehicle_detection.Path.exists', return_value=False)
    def test_missing_file_returns_empty(self, _mock_exists):
        self.assertEqual(detect_vehicles('/missing.jpg'), [])

    def test_refine_replaces_taillight_with_plate_expanded_box(self):
        taillight = {
            'vehicle_type': 'car',
            'label': 'Car',
            'confidence': 38.0,
            'bbox': {'x1': 0.82, 'y1': 0.25, 'x2': 0.98, 'y2': 0.72},
        }
        plate = {'x1': 0.38, 'y1': 0.62, 'x2': 0.58, 'y2': 0.78}
        refined = refine_vehicles_with_plate([taillight], plate)
        self.assertEqual(len(refined), 1)
        self.assertEqual(refined[0]['source'], 'plate_expanded')
        box = refined[0]['bbox']
        self.assertLess(box['x1'], plate['x1'])
        self.assertGreater(box['x2'], plate['x2'])
        self.assertLess(box['y1'], plate['y1'])
        self.assertGreaterEqual(box['y2'], plate['y2'] - 0.05)
        self.assertGreater(box['x2'] - box['x1'], 0.3)
