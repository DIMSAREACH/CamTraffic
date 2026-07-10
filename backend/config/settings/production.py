from config.env import running_in_docker

from .base import *  # noqa: F403

DEBUG = False

# Docker health checks and internal service-to-service calls use localhost/backend.
if running_in_docker():
    for _docker_host in ('localhost', '127.0.0.1', 'backend'):
        if _docker_host not in ALLOWED_HOSTS:  # noqa: F405
            ALLOWED_HOSTS.append(_docker_host)  # noqa: F405

if not os.environ.get('LOG_FORMAT'):  # noqa: F405
    os.environ['LOG_FORMAT'] = 'json'  # noqa: F405
if not os.environ.get('LOG_FILE'):  # noqa: F405
    os.environ['LOG_FILE'] = str(BASE_DIR / 'logs' / 'camtraffic.log')  # noqa: F405

LOGGING = get_logging_config(BASE_DIR)  # noqa: F405

REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'] = [  # noqa: F405
    'rest_framework.permissions.IsAuthenticated',
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1', 'yes')  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
