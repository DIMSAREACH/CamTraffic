"""Production overrides — use: DJANGO_SETTINGS_MODULE=camtraffic.settings_production"""
import os

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
