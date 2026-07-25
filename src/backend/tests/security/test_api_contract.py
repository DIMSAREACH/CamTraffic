"""OpenAPI schema and API throttling tests."""
import sys
import unittest

from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient, APIRequestFactory

from core.throttling import AnonBurstRateThrottle, _is_exempt


@override_settings(ENABLE_API_DOCS=True)
class OpenAPISchemaTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_schema_endpoint_returns_openapi(self):
        res = self.client.get(
            '/api/schema/',
            HTTP_ACCEPT='application/vnd.oai.openapi+json',
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn('openapi', body)
        self.assertEqual(body['info']['title'], 'CamTraffic API')

    @unittest.skipIf(
        sys.version_info >= (3, 14),
        'Django test client copy(RequestContext) breaks on Python 3.14+ '
        '(AttributeError on Context.__copy__); /api/docs/ still works outside tests.',
    )
    def test_swagger_ui_available(self):
        res = self.client.get('/api/docs/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/html', res['Content-Type'])


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    },
)
class APIThrottleTest(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    def test_anon_burst_throttle_blocks_after_limit(self):
        throttle = AnonBurstRateThrottle()
        throttle.rate = '3/min'
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)

        for _ in range(3):
            request = self.factory.get('/api/users/')
            request.user = AnonymousUser()
            self.assertTrue(throttle.allow_request(request, view=None))

        request = self.factory.get('/api/users/')
        request.user = AnonymousUser()
        self.assertFalse(throttle.allow_request(request, view=None))

    def test_exempt_paths_skip_throttle(self):
        self.assertTrue(_is_exempt('/api/health/'))
        self.assertTrue(_is_exempt('/api/schema/'))
        self.assertTrue(_is_exempt('/api/docs/'))
        self.assertFalse(_is_exempt('/api/users/'))

    def test_health_exempt_from_throttle(self):
        client = APIClient()
        for _ in range(5):
            res = client.get('/api/health/')
            self.assertEqual(res.status_code, 200)
