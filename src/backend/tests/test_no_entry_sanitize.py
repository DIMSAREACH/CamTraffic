"""No Entry shape correction — weak vehicle-specific YOLO labels."""
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from ai_detection.services import (
    _generic_no_entry_bar_hint,
    _result_from_class_key,
    _sanitize_vehicle_specific_no_entry,
)
from tests.catalog_helpers import assert_sign_code, sign_media_path


class NoEntrySanitizeTest(SimpleTestCase):
    def _no_entry_path(self) -> Path:
        return sign_media_path(
            settings.MEDIA_ROOT,
            'R1-04.png',
            'PW03-R1-04.png',
            'NO_ENTRY_No entry.png',
            'KH_NO_ENTRY_No entry.png',
        )

    def test_generic_no_entry_bar_detected_on_catalog_art(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        self.assertTrue(_generic_no_entry_bar_hint(str(path)))

    def test_weak_motorcycle_drawn_remapped_to_no_entry(self):
        path = self._no_entry_path()
        if not path.is_file():
            self.skipTest('No Entry catalog image missing')
        weak = _result_from_class_key('no_entry_motorcycle_drawn', confidence=28.2)
        fixed = _sanitize_vehicle_specific_no_entry(str(path), weak)
        self.assertIsNotNone(fixed)
        assert_sign_code(self, fixed, 'PW03-R1-04', 'R1-04')
        self.assertIn('entry', fixed['sign_name_en'].lower())
