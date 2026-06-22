"""YOLO class index mapping for the 10-class thesis model."""
from django.test import SimpleTestCase

from ai_detection.yolo_class_mapping import YOLO_CLASS_MAPPING, class_key_for_yolo_id


class YoloClassMappingTests(SimpleTestCase):
    def test_ten_class_order_matches_dataset(self):
        self.assertEqual(len(YOLO_CLASS_MAPPING), 10)
        self.assertEqual(class_key_for_yolo_id(0), 'NO_ENTRY')
        self.assertEqual(class_key_for_yolo_id(1), 'NO_LEFT_TURN')
        self.assertEqual(class_key_for_yolo_id(9), 'I_ONE_WAY_TRAFFIC')

    def test_unknown_id_returns_none(self):
        self.assertIsNone(class_key_for_yolo_id(99))
