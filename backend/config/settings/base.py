import os
from datetime import timedelta
from pathlib import Path

from config.env import (
    environment_name,
    get_bool,
    get_int,
    load_environment,
    resolve_postgres_port,
)
from config.logging import get_logging_config

load_environment()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

CAMTRAFFIC_ENV = environment_name()

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-only-insecure-key-change-me')
DEBUG = get_bool('DJANGO_DEBUG', CAMTRAFFIC_ENV != 'production')

_allowed_hosts = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    'localhost,127.0.0.1,backend,0.0.0.0',
)
ALLOWED_HOSTS = [host.strip() for host in _allowed_hosts.split(',') if host.strip()]

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',
]

LOCAL_APPS = [
    'apps.core',
    'apps.accounts',
    'apps.rbac',
    'apps.users',
    'apps.officers',
    'apps.drivers',
    'apps.vehicles',
    'apps.cameras',
    'apps.traffic_signs',
    'apps.ai_models',
    'apps.detections',
    'apps.ocr',
    'apps.violations',
    'apps.fines',
    'apps.appeals',
    'apps.reports',
    'apps.notifications',
    'apps.dashboard',
    'apps.audit',
    'apps.system',
    'apps.integration',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'apps.core.middleware.request_id.RequestIdMiddleware',
    'apps.core.middleware.security_hardening.SecurityHardeningMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.core.middleware.request_logging.RequestLoggingMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'camtraffic_db'),
        'USER': os.environ.get('POSTGRES_USER', 'camtraffic'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'camtraffic'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': resolve_postgres_port(),
        'CONN_MAX_AGE': get_int('POSTGRES_CONN_MAX_AGE', 0),
    }
}

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
LANGUAGES = [
    ('en', 'English'),
    ('km', 'Khmer'),
]
TIME_ZONE = os.environ.get('TIME_ZONE', 'Asia/Phnom_Penh')
USE_I18N = True
USE_TZ = True
LOCALE_PATHS = [BASE_DIR / 'locale']

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── External services ─────────────────────────────────────────────────────────
AI_SERVICE_URL = os.environ.get('AI_SERVICE_URL', 'http://localhost:8001')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000')

# ── JWT (Task 011) ────────────────────────────────────────────────────────────
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = get_int('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60)
JWT_REFRESH_TOKEN_LIFETIME_DAYS = get_int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7)
JWT_ROTATE_REFRESH_TOKENS = get_bool('JWT_ROTATE_REFRESH_TOKENS', True)
JWT_BLACKLIST_AFTER_ROTATION = get_bool('JWT_BLACKLIST_AFTER_ROTATION', True)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_TOKEN_LIFETIME_DAYS),
    'ROTATE_REFRESH_TOKENS': JWT_ROTATE_REFRESH_TOKENS,
    'BLACKLIST_AFTER_ROTATION': JWT_BLACKLIST_AFTER_ROTATION,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = get_int('EMAIL_PORT', 587)
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = get_bool('EMAIL_USE_TLS', True)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@camtraffic.kh')
ADMIN_PORTAL_URL = os.environ.get('ADMIN_PORTAL_URL', 'http://localhost:5173')
USER_PORTAL_URL = os.environ.get('USER_PORTAL_URL', 'http://localhost:5174')

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': get_int('API_PAGE_SIZE', 20),
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
}

_cors_origins = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:5174',
)
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(',') if origin.strip()]
CORS_ALLOW_CREDENTIALS = True

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

ENABLE_REQUEST_LOGGING = get_bool('ENABLE_REQUEST_LOGGING', True)

# ── Security Middleware (Task 024) ────────────────────────────────────────────
SECURITY_LOGIN_RATE_LIMIT_ENABLED = get_bool('SECURITY_LOGIN_RATE_LIMIT_ENABLED', True)
SECURITY_LOGIN_RATE_LIMIT_ATTEMPTS = get_int('SECURITY_LOGIN_RATE_LIMIT_ATTEMPTS', 10)
SECURITY_LOGIN_RATE_LIMIT_WINDOW_SECONDS = get_int('SECURITY_LOGIN_RATE_LIMIT_WINDOW_SECONDS', 300)

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

LOGGING = get_logging_config(BASE_DIR)
