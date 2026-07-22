"""Catalog visual matching against 236-sign reference images."""
from django.test import SimpleTestCase, override_settings

from ai_detection.catalog_visual_match import (
    catalog_visual_index_size,
    match_sign_from_catalog_images,
)
from tests.catalog_helpers import catalog_10_active


class CatalogVisualMatchTest(SimpleTestCase):
    @override_settings(
        AI_CATALOG_VISUAL_MATCH_ENABLED=True,
        MEDIA_ROOT=str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'media'),
    )
    def test_index_builds_with_reference_images(self):
        size = catalog_visual_index_size()
        min_expected = 10 if catalog_10_active() else 50
        self.assertGreaterEqual(size, min_expected)

    @override_settings(AI_CATALOG_VISUAL_MATCH_ENABLED=False)
    def test_disabled_returns_none(self):
        self.assertIsNone(match_sign_from_catalog_images('/tmp/x.jpg'))
