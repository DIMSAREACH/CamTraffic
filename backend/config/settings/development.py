import os

from config.env import resolve_host, resolve_postgres_port, resolve_redis_url

from .base import *  # noqa: F403

DEBUG = True

# Local manage.py uses localhost; Docker Compose overrides service hostnames.
DATABASES['default']['HOST'] = resolve_host('POSTGRES_HOST')  # noqa: F405
DATABASES['default']['PORT'] = resolve_postgres_port()  # noqa: F405

REDIS_URL = resolve_redis_url()
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append(  # noqa: F405
    'rest_framework.renderers.BrowsableAPIRenderer',
)

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
