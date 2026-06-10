from django.test import SimpleTestCase

from ai_detection.result_compose import compose_detection_payload, notification_message


class ResultComposeTest(SimpleTestCase):
    def test_vehicle_mode_when_no_sign_but_vehicle_found(self):
        sign = {
            'sign_name': 'ស្លាកមិនស្គាល់',
            'sign_name_en': 'Unknown sign',
            'confidence': 0.0,
            'description': 'no sign',
            'guidance': 'try again',
            'class_key': '',
        }
        vehicles = [{
            'vehicle_type': 'motorcycle',
            'label': 'Motorcycle',
            'confidence': 80.4,
            'bbox': {'x1': 0, 'y1': 0, 'x2': 1, 'y2': 1},
        }]
        payload = compose_detection_payload(sign, vehicles)
        self.assertEqual(payload['detection_mode'], 'vehicle')
        self.assertEqual(payload['display_title_en'], 'Motorcycle')
        self.assertEqual(payload['display_confidence'], 80.4)
        self.assertIn('Motorcycle', notification_message(payload))

    def test_plate_mode_when_no_sign_but_plate_read(self):
        sign = {
            'sign_name': 'ស្លាកមិនស្គាល់',
            'sign_name_en': 'Unknown sign',
            'confidence': 0.0,
            'description': 'no sign',
            'guidance': 'try again',
            'class_key': '',
        }
        plate = {
            'plate_text': '2A-1234',
            'plate_confidence': 97.3,
            'plate_type': 'private',
            'raw_reads': [],
        }
        payload = compose_detection_payload(sign, [], plate)
        self.assertEqual(payload['detection_mode'], 'plate')
        self.assertEqual(payload['display_title_en'], '2A-1234')
        self.assertEqual(payload['display_confidence'], 97.3)
        self.assertIn('2A-1234', notification_message(payload))

    def test_vehicle_mode_includes_plate_context(self):
        sign = {
            'sign_name': 'ស្លាកមិនស្គាល់',
            'sign_name_en': 'Unknown sign',
            'confidence': 0.0,
            'description': 'no sign',
            'guidance': 'try again',
            'class_key': '',
        }
        vehicles = [{
            'vehicle_type': 'car',
            'label': 'Car',
            'confidence': 89.9,
            'bbox': {'x1': 0, 'y1': 0, 'x2': 1, 'y2': 1},
        }]
        plate = {
            'plate_text': '2A-1234',
            'plate_confidence': 82.5,
            'plate_type': 'private',
            'raw_reads': [],
        }
        payload = compose_detection_payload(sign, vehicles, plate)
        self.assertEqual(payload['detected_plate'], '2A-1234')
        self.assertIn('2A-1234', payload['description'])
        self.assertIn('2A-1234', notification_message(payload))

    def test_no_sign_mode_without_vehicles(self):
        sign = {
            'sign_name': 'ស្លាកមិនស្គាល់',
            'sign_name_en': 'Unknown sign',
            'confidence': 0.0,
            'description': 'no sign',
            'guidance': 'try again',
            'class_key': '',
        }
        payload = compose_detection_payload(sign, [])
        self.assertEqual(payload['detection_mode'], 'unknown_sign')
        self.assertEqual(payload['display_title_en'], 'Unknown sign')
