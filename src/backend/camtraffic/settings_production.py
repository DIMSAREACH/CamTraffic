"""Production overrides — use: DJANGO_SETTINGS_MODULE=camtraffic.settings_production"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403,F401

DEBUG = False
USE_SQLITE = False
USE_REDIS = os.getenv('USE_REDIS', 'True').lower() == 'true'

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() == 'true'  # noqa: F405
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

LOGGING = build_logging_config(BASE_DIR, use_json=True)  # noqa: F405
_log_level = os.getenv('DJANGO_LOG_LEVEL', 'INFO').upper()
LOGGING['root']['level'] = _log_level  # noqa: F405
LOGGING['root']['handlers'] = ['console', 'file']  # noqa: F405
LOGGING['loggers']['django']['level'] = _log_level  # noqa: F405
LOGGING['loggers']['camtraffic.request']['level'] = _log_level  # noqa: F405

if USE_REDIS:  # noqa: F405
    CACHES = {  # noqa: F811
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,  # noqa: F405
            'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
            'KEY_PREFIX': 'camtraffic',
        }
    }

# Cross-origin browser calls from Render static sites and camtraffic.store subdomains.
if os.getenv('CORS_ALLOW_RENDER_ORIGINS', 'true').lower() == 'true':
    _render_origin = r'^https://[\w-]+\.onrender\.com$'
    if _render_origin not in CORS_ALLOWED_ORIGIN_REGEXES:  # noqa: F405
        CORS_ALLOWED_ORIGIN_REGEXES.append(_render_origin)  # noqa: F405

if os.getenv('CORS_ALLOW_CAMTRAFFIC_STORE', 'true').lower() == 'true':
    _store_origin = r'^https://([\w-]+\.)?camtraffic\.store$'
    if _store_origin not in CORS_ALLOWED_ORIGIN_REGEXES:  # noqa: F405
        CORS_ALLOWED_ORIGIN_REGEXES.append(_store_origin)  # noqa: F405

# ── Production AI — real weights only, never silent mock ──────────────────────
_main_weights_path = Path(AI_MODEL_PATH)  # noqa: F405
_vehicle_weights_path = AI_ROOT / 'weights' / AI_VEHICLE_MODEL  # noqa: F405
_plate_weights_path = AI_ROOT / 'weights' / AI_PLATE_DETECT_MODEL  # noqa: F405

_weights_missing = not _main_weights_path.is_file()
_vehicle_weights_missing = not _vehicle_weights_path.is_file()
_plate_weights_missing = not _plate_weights_path.is_file()

# Explicit opt-out only for documented hosted-lite deploys (not default production).
_allow_missing = os.getenv('AI_ALLOW_MISSING_WEIGHTS', 'False').lower() == 'true'
_hosted_lite = os.getenv('AI_HOSTED_LITE', '').lower() == 'true'

if _weights_missing and not (_allow_missing or _hosted_lite):
    raise ImproperlyConfigured(
        f'Production AI weights not found: {_main_weights_path}. '
        'Deploy ai/weights/best.pt or set AI_ALLOW_MISSING_WEIGHTS=true for hosted-lite only.'
    )
if _vehicle_weights_missing and AI_VEHICLE_ENABLED and not (_allow_missing or _hosted_lite):  # noqa: F405
    raise ImproperlyConfigured(
        f'Production vehicle weights not found: {_vehicle_weights_path}. '
        f'Deploy ai/weights/{AI_VEHICLE_MODEL}.'  # noqa: F405
    )
if _plate_weights_missing and AI_PLATE_DETECT_ENABLED and not (_allow_missing or _hosted_lite):  # noqa: F405
    raise ImproperlyConfigured(
        f'Production plate weights not found: {_plate_weights_path}. '
        f'Deploy ai/weights/{AI_PLATE_DETECT_MODEL}.'  # noqa: F405
    )

# Never silently fall back to mock in production.
AI_USE_MOCK = False  # noqa: F811
AI_PIPELINE_DEMO_VIOLATION = False  # noqa: F811
AI_WARMUP_MODELS = os.getenv('AI_WARMUP_MODELS', 'True').lower() == 'true'  # noqa: F405
DEMO_CAMERA_FRAMES_ENABLED = False  # noqa: F811
ENABLE_TEST_WEBHOOKS = False  # noqa: F811

# Hosted-lite: disable missing pipeline stages instead of mocking detections.
if (_allow_missing or _hosted_lite) and _weights_missing:
    raise ImproperlyConfigured(
        'AI_HOSTED_LITE / AI_ALLOW_MISSING_WEIGHTS cannot run without sign weights. '
        'Mount best.pt or disable AI endpoints.'
    )
if _hosted_lite or _allow_missing:
    if _vehicle_weights_missing:
        AI_VEHICLE_ENABLED = False  # noqa: F811
    if _plate_weights_missing:
        AI_PLATE_DETECT_ENABLED = False  # noqa: F811
        AI_PLATE_OCR_ENABLED = False  # noqa: F811
