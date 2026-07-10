"""Security middleware for headers and auth endpoint rate limiting."""

from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


class SecurityHardeningMiddleware:
    """Apply lightweight API hardening for security-sensitive routes."""

    LOGIN_PATH = '/api/v1/auth/login/'

    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit_enabled = getattr(settings, 'SECURITY_LOGIN_RATE_LIMIT_ENABLED', True)
        self.rate_limit_attempts = getattr(settings, 'SECURITY_LOGIN_RATE_LIMIT_ATTEMPTS', 10)
        self.rate_limit_window_seconds = getattr(settings, 'SECURITY_LOGIN_RATE_LIMIT_WINDOW_SECONDS', 300)

    def __call__(self, request):
        if self._is_rate_limited(request):
            return JsonResponse(
                {
                    'success': False,
                    'message': 'Too many login attempts. Please try again later.',
                },
                status=429,
            )

        response = self.get_response(request)
        self._set_security_headers(response)
        return response

    def _is_rate_limited(self, request) -> bool:
        if not self.rate_limit_enabled:
            return False
        if request.method != 'POST' or request.path != self.LOGIN_PATH:
            return False

        ip_address = self._client_ip(request)
        key = f'login-rate-limit:{ip_address}'
        now = int(time.time())

        attempts = cache.get(key, [])
        attempts = [attempt for attempt in attempts if now - attempt < self.rate_limit_window_seconds]
        attempts.append(now)
        cache.set(key, attempts, timeout=self.rate_limit_window_seconds)

        return len(attempts) > self.rate_limit_attempts

    @staticmethod
    def _client_ip(request) -> str:
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

    @staticmethod
    def _set_security_headers(response) -> None:
        response.setdefault('X-Content-Type-Options', 'nosniff')
        response.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        response.setdefault('Cross-Origin-Opener-Policy', 'same-origin')
