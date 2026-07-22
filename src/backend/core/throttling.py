"""DRF rate limiting — burst + sustained; exempt health, docs, and login (login has its own limiter)."""
from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

_EXEMPT_EXACT = frozenset({
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/auth/password-reset/',
    '/api/health/',
    '/health/',
    '/health/ready/',
    '/health/status/',
})

_EXEMPT_PREFIXES = (
    '/api/schema',
    '/api/docs',
    '/api/redoc',
)


def _is_exempt(path: str) -> bool:
    if path in _EXEMPT_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in _EXEMPT_PREFIXES)


class _ExemptThrottleMixin:
    def allow_request(self, request, view):
        if _is_exempt(request.path):
            return True
        return super().allow_request(request, view)


class AnonBurstRateThrottle(_ExemptThrottleMixin, AnonRateThrottle):
    scope = 'anon'


class BurstRateThrottle(_ExemptThrottleMixin, UserRateThrottle):
    scope = 'burst'


class SustainedRateThrottle(_ExemptThrottleMixin, UserRateThrottle):
    scope = 'sustained'
