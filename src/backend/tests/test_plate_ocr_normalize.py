from django.test import SimpleTestCase, override_settings

from ai_detection.plate_ocr import normalize_plate_text


class PlateOcrNormalizeTests(SimpleTestCase):
    def test_standard_private_plate(self):
        self.assertEqual(normalize_plate_text('12A-3456'), '12A-3456')

    def test_loose_spacing(self):
        self.assertEqual(normalize_plate_text('12A3456'), '12A-3456')

    def test_ocr_o_to_zero_in_serial(self):
        self.assertEqual(normalize_plate_text('12A-34O6'), '12A-3406')

    def test_ocr_i_to_one_in_serial(self):
        self.assertEqual(normalize_plate_text('12A-34I6'), '12A-3416')

    def test_alpha_commercial(self):
        self.assertEqual(normalize_plate_text('PP2A1234'), 'PP2A-1234')
