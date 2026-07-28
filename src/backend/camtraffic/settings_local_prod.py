"""Local production-like settings (no Docker).

Use when you want Gunicorn/Waitress + built SPAs without TLS/Docker:
  DJANGO_SETTINGS_MODULE=camtraffic.settings_local_prod
"""
import os

# Disable SSL-only bits before importing production overrides.
os.environ.setdefault('SECURE_SSL_REDIRECT', 'False')
os.environ.setdefault('USE_REDIS', 'False')

from .settings_production import *  # noqa: F403,F401

DEBUG = False
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Preview SPA ports (vite preview) + keep existing portal ports.
_extra_origins = [
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'http://127.0.0.1:4174',
    'http://localhost:4174',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5174',
]
for _origin in _extra_origins:
    if _origin not in CORS_ALLOWED_ORIGINS:  # noqa: F405
        CORS_ALLOWED_ORIGINS.append(_origin)  # noqa: F405
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)  # noqa: F405
