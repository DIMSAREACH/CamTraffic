"""Catalog visual matching against reference images."""
from pathlib import Path

from django.test import SimpleTestCase, override_settings

from ai_detection.catalog_visual_match import (
    catalog_visual_index_size,
    match_sign_from_catalog_images,
    warmup_catalog_visual_index,
)
from tests.catalog_helpers import catalog_10_active


class CatalogVisualMatchTest(SimpleTestCase):
    @override_settings(
        AI_CATALOG_VISUAL_MATCH_ENABLED=True,
        MEDIA_ROOT=str(Path(__file__).resolve().parents[1] / 'media'),
    )
    def test_index_builds_with_reference_images(self):
        size = warmup_catalog_visual_index()
        if size == 0:
            self.skipTest('No catalog reference images under MEDIA_ROOT/signs (optional offline assets)')
        min_expected = 10 if catalog_10_active() else 50
        self.assertGreaterEqual(size, min_expected)
        self.assertEqual(catalog_visual_index_size(), size)

    @override_settings(AI_CATALOG_VISUAL_MATCH_ENABLED=False)
    def test_disabled_returns_none(self):
        self.assertIsNone(match_sign_from_catalog_images('/tmp/x.jpg'))
