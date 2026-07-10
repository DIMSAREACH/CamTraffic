"""Log HTTP requests with duration and status code."""

from __future__ import annotations

import logging
import time

from django.conf import settings

logger = logging.getLogger('apps.request')

SKIP_PATHS = (
    '/health/',
    '/health/ready/',
    '/api/v1/health/',
    '/api/v1/monitoring/status/',
)


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'ENABLE_REQUEST_LOGGING', True)

    def __call__(self, request):
        if not self.enabled or request.path in SKIP_PATHS:
            return self.get_response(request)

        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            '%s %s %s %.2fms',
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            extra={'request_id': getattr(request, 'request_id', '-')},
        )
        return response
