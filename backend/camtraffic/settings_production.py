"""Production overrides — use: DJANGO_SETTINGS_MODULE=camtraffic.settings_production"""
import os
from pathlib import Path

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
# Override with CORS_ALLOW_RENDER_ORIGINS=false or CORS_ALLOW_CAMTRAFFIC_STORE=false if needed.
if os.getenv('CORS_ALLOW_RENDER_ORIGINS', 'true').lower() == 'true':
    _render_origin = r'^https://[\w-]+\.onrender\.com$'
    if _render_origin not in CORS_ALLOWED_ORIGIN_REGEXES:  # noqa: F405
        CORS_ALLOWED_ORIGIN_REGEXES.append(_render_origin)  # noqa: F405

if os.getenv('CORS_ALLOW_CAMTRAFFIC_STORE', 'true').lower() == 'true':
    _store_origin = r'^https://([\w-]+\.)?camtraffic\.store$'
    if _store_origin not in CORS_ALLOWED_ORIGIN_REGEXES:  # noqa: F405
        CORS_ALLOWED_ORIGIN_REGEXES.append(_store_origin)  # noqa: F405

# Render / small containers: avoid EasyOCR, auto-download YOLO weights, and warmup OOM.
_on_render = os.getenv('RENDER', '').lower() == 'true'
if _on_render or os.getenv('AI_HOSTED_LITE', '').lower() == 'true':
    AI_WARMUP_MODELS = os.getenv('AI_WARMUP_MODELS', 'False').lower() == 'true'  # noqa: F405
    _weights_path = Path(AI_MODEL_PATH)  # noqa: F405
    if not _weights_path.is_file():
        AI_USE_MOCK = True  # noqa: F405
    if os.getenv('AI_PLATE_OCR_ENABLED') is None:
        AI_PLATE_OCR_ENABLED = False  # noqa: F405
    if os.getenv('AI_VEHICLE_ENABLED') is None:
        AI_VEHICLE_ENABLED = False  # noqa: F405
