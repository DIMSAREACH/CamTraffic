"""Health and readiness checks for CamTraffic services (Task 007)."""

from __future__ import annotations

import time
from typing import Any

from django.conf import settings
from django.db import connection


def _elapsed_ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)


def check_database() -> dict[str, Any]:
    start = time.perf_counter()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return {'status': 'ok', 'latency_ms': _elapsed_ms(start)}
    except Exception as exc:  # noqa: BLE001 — health probe must not raise
        return {
            'status': 'error',
            'latency_ms': _elapsed_ms(start),
            'error': str(exc),
        }


def check_redis() -> dict[str, Any]:
    start = time.perf_counter()
    try:
        import redis

        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
        return {'status': 'ok', 'latency_ms': _elapsed_ms(start)}
    except Exception as exc:  # noqa: BLE001
        return {
            'status': 'error',
            'latency_ms': _elapsed_ms(start),
            'error': str(exc),
        }


def _aggregate(checks: dict[str, dict[str, Any]]) -> str:
    return 'ok' if all(item.get('status') == 'ok' for item in checks.values()) else 'degraded'


def get_liveness() -> dict[str, Any]:
    """Process is running — used by Docker liveness probes."""
    return {
        'status': 'ok',
        'service': 'backend',
        'check': 'liveness',
    }


def get_readiness() -> dict[str, Any]:
    """Dependency checks — used before routing traffic to the instance."""
    checks = {
        'database': check_database(),
        'redis': check_redis(),
    }
    return {
        'status': _aggregate(checks),
        'service': 'backend',
        'check': 'readiness',
        'checks': checks,
    }


def get_system_status() -> dict[str, Any]:
    """Detailed monitoring payload for operators and dashboards."""
    checks = {
        'database': check_database(),
        'redis': check_redis(),
    }
    return {
        'status': _aggregate(checks),
        'service': 'backend',
        'environment': getattr(settings, 'CAMTRAFFIC_ENV', 'development'),
        'checks': checks,
    }
