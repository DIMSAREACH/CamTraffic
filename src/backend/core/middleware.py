"""Request tracing, API logging, and security hardening."""
from __future__ import annotations

import logging
import time
import uuid

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('camtraffic.request')

LOGIN_PATH = '/api/auth/login/'


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        request.request_id = request_id
        response = self.get_response(request)
        response['X-Request-ID'] = request_id
        return response


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000
        request_id = getattr(request, 'request_id', '-')
        logger.info(
            '%s %s %s %.1fms rid=%s',
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


class SecurityHardeningMiddleware:
    """Login rate limiting + standard security response headers."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.max_attempts = int(getattr(settings, 'LOGIN_RATE_LIMIT_MAX', 10))
        self.window_seconds = int(getattr(settings, 'LOGIN_RATE_LIMIT_WINDOW', 300))

    def __call__(self, request):
        if request.method == 'POST' and request.path == LOGIN_PATH:
            try:
                if self._is_rate_limited(request):
                    return JsonResponse(
                        {
                            'success': False,
                            'message': 'Too many login attempts. Please try again in a few minutes.',
                        },
                        status=429,
                    )
            except Exception:
                logger.exception('Login rate limit check failed; allowing request')

        response = self.get_response(request)
        self._apply_security_headers(response)

        if request.method == 'POST' and request.path == LOGIN_PATH:
            try:
                if response.status_code in (401, 403):
                    self._record_failed_attempt(request)
                elif response.status_code == 200:
                    self._clear_attempts(request)
            except Exception:
                logger.exception('Login rate limit update failed')

        return response

    def _client_key(self, request) -> str:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', 'unknown')
        return f'login_rate:{ip}'

    def _is_rate_limited(self, request) -> bool:
        key = self._client_key(request)
        attempts = cache.get(key, 0)
        return attempts >= self.max_attempts

    def _record_failed_attempt(self, request) -> None:
        key = self._client_key(request)
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, timeout=self.window_seconds)

    def _clear_attempts(self, request) -> None:
        cache.delete(self._client_key(request))

    @staticmethod
    def _apply_security_headers(response) -> None:
        response.setdefault('X-Content-Type-Options', 'nosniff')
        response.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        if not settings.DEBUG:
            response.setdefault('Cross-Origin-Embedder-Policy', 'credentialless')
