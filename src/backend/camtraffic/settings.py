"""
CamTraffic Django settings — production-ready with env-based configuration.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

from config.logging import build_logging_config

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent.parent  # src/backend → CamTraffic repo root
# Re-read .env on every process start/reload so AI_MODEL_PATH switches take effect
load_dotenv(BASE_DIR / '.env', override=True)

# Thesis package at repo root: mobile_api/
import sys

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
# Also keep src/ on path for any src-level packages
_src = BASE_DIR.parent
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-only-change-in-production')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'core',
    'authentication',
    'users',
    'rbac',
    'infrastructure',
    'vehicles',
    'traffic_signs',
    'violations',
    'fines',
    'ai_detection.apps.AiDetectionConfig',
    'notifications',
    'dashboard',
    'appeals',
    'audit',
    'unknown_vehicles',
    'ai_models',
    'datasets',
    'imports',
]

# Cloud media (R2/S3) — only load django-storages when enabled.
USE_S3_MEDIA = os.getenv('USE_S3_MEDIA', 'False').lower() == 'true'
if USE_S3_MEDIA:
    try:
        import storages  # noqa: F401
    except ImportError as exc:
        raise ImportError(
            'USE_S3_MEDIA=True requires django-storages. '
            'Install with: backend/venv/Scripts/python -m pip install "django-storages[s3]>=1.14" '
            '(or set USE_S3_MEDIA=False for local media).'
        ) from exc
    INSTALLED_APPS.insert(INSTALLED_APPS.index('django.contrib.staticfiles') + 1, 'storages')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'core.middleware.RequestIdMiddleware',
    'core.middleware.RequestLoggingMiddleware',
    'middleware.api_error_handler.APIErrorHandlerMiddleware',
    'core.middleware.SecurityHardeningMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'camtraffic.urls'
WSGI_APPLICATION = 'camtraffic.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

USE_SQLITE = os.getenv('USE_SQLITE', 'True').lower() == 'true'

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            # timeout=30 makes readers wait up to 30 s for a write lock instead
            # of failing immediately with "database is locked".
            'OPTIONS': {'timeout': 30},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'camtraffic_db'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '60')),
        }
    }

# ── Redis (cache + Celery broker) ─────────────────────────────────────────────
REDIS_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')
USE_REDIS = os.getenv('USE_REDIS', 'False').lower() == 'true'

if USE_REDIS:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'camtraffic',
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'camtraffic-local',
        }
    }

# ── Celery (background workers — foundation config only) ────────────────────
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/1')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Phnom_Penh'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_DEFAULT_QUEUE = 'default'
# Windows: prefork pool crashes in billiard (use solo — one task at a time)
if os.name == 'nt':
    CELERY_WORKER_POOL = 'solo'
    CELERY_WORKER_CONCURRENCY = 1
CELERY_BEAT_SCHEDULE = {
    'mark-overdue-fines-daily': {
        'task': 'camtraffic.mark_overdue_fines',
        'schedule': 86400.0,
    },
    'celery-ping-hourly': {
        'task': 'camtraffic.ping',
        'schedule': 3600.0,
    },
}

# Local dev without Redis: run tasks inline (no broker connection retries).
if not USE_REDIS:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'authentication.validators.StrongPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Phnom_Penh'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Optional cloud media (Cloudflare R2 free tier or AWS S3). When enabled, uploads
# leave the ephemeral Render disk and survive redeploys.
if USE_S3_MEDIA:
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', '')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'auto')
    AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL', '').strip() or None
    AWS_S3_CUSTOM_DOMAIN = os.getenv('AWS_S3_CUSTOM_DOMAIN', '').strip() or None
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    # Keep keys under media/ so URLs look like …/media/signs/…
    AWS_LOCATION = os.getenv('AWS_LOCATION', 'media').strip() or 'media'
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
    # Keep MEDIA_URL as /media/ so Django can still serve local disk hybrids and
    # Vite can proxy /media → API. Public R2 URLs are built in api_media_url / api_media_path.
    MEDIA_URL = '/media/'

# Large AI video uploads (default 500 MB; override with AI_VIDEO_MAX_MB).
_AI_VIDEO_MAX_MB = max(1, int(os.getenv('AI_VIDEO_MAX_MB', '500')))
DATA_UPLOAD_MAX_MEMORY_SIZE = min(10 * 1024 * 1024, _AI_VIDEO_MAX_MB * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE
BACKUP_ROOT = BASE_DIR / 'backups'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000',
    ).split(',')
    if o.strip()
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r.strip()
    for r in os.getenv('CORS_ALLOWED_ORIGIN_REGEXES', '').split(',')
    if r.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

PUBLIC_API_URL = os.getenv('PUBLIC_API_URL', '').strip().rstrip('/')
# Always keep a local /media/ mount for Vite proxy + hybrid R2 (files may still be on disk).
# Cloud URLs are returned by api_media_url when the object is only on R2/S3.
if USE_S3_MEDIA:
    SERVE_MEDIA = os.getenv('SERVE_MEDIA', 'True' if DEBUG else 'False').lower() == 'true'
else:
    SERVE_MEDIA = os.getenv('SERVE_MEDIA', 'True').lower() == 'true'
GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '')
GITHUB_OAUTH_CLIENT_ID = os.getenv('GITHUB_OAUTH_CLIENT_ID', '')
GITHUB_OAUTH_CLIENT_SECRET = os.getenv('GITHUB_OAUTH_CLIENT_SECRET', '')
OAUTH_FRONTEND_CALLBACK_URL = os.getenv(
    'OAUTH_FRONTEND_CALLBACK_URL',
    'http://localhost:5173/auth/oauth/callback',
)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'core.throttling.AnonBurstRateThrottle',
        'core.throttling.BurstRateThrottle',
        'core.throttling.SustainedRateThrottle',
    ),
    # Local SPA navigation + StrictMode + live polling easily exceeds production-ish
    # 2000/hour; keep generous DEBUG defaults and require explicit env in production.
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv(
            'API_THROTTLE_ANON',
            '600/min' if DEBUG else '60/min',
        ),
        'burst': os.getenv(
            'API_THROTTLE_BURST',
            '1200/min' if DEBUG else '120/min',
        ),
        'sustained': os.getenv(
            'API_THROTTLE_SUSTAINED',
            '50000/hour' if DEBUG else '2000/hour',
        ),
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# AI module — Option 1 (defense): local = OpenCV + YOLO + catalog/OCR only (offline).
# Set AI_DETECTION_MODE=hybrid to allow optional Gemini Vision fallback.
AI_DETECTION_MODE = os.getenv('AI_DETECTION_MODE', 'local').strip().lower()
AI_MODEL_PATH = os.getenv('AI_MODEL_PATH', str(BASE_DIR.parent.parent / 'ai' / 'weights' / 'best.pt'))
AI_USE_MOCK = os.getenv('AI_USE_MOCK', 'False').lower() == 'true'
AI_CONFIDENCE_THRESHOLD = float(os.getenv('AI_CONFIDENCE_THRESHOLD', '0.35'))
AI_MIN_RESULT_CONFIDENCE = float(os.getenv('AI_MIN_RESULT_CONFIDENCE', '35'))
AI_ABSOLUTE_YOLO_FLOOR = float(os.getenv('AI_ABSOLUTE_YOLO_FLOOR', '18'))
AI_LIVE_YOLO_FLOOR = float(os.getenv('AI_LIVE_YOLO_FLOOR', '10'))
AI_LIVE_YOLO_INFER_CONF = float(os.getenv('AI_LIVE_YOLO_INFER_CONF', '0.50'))
AI_LIVE_YOLO_TRUST = float(os.getenv('AI_LIVE_YOLO_TRUST', '50'))
AI_LIVE_YOLO_CATALOG_MIN = float(os.getenv('AI_LIVE_YOLO_CATALOG_MIN', '45'))
AI_LIVE_IMGSZ = int(os.getenv('AI_LIVE_IMGSZ', '640'))
AI_LIVE_TRY_ENHANCE = os.getenv('AI_LIVE_TRY_ENHANCE', 'True').lower() == 'true'
AI_CATALOG_VISUAL_MATCH_ENABLED = os.getenv('AI_CATALOG_VISUAL_MATCH_ENABLED', 'True').lower() == 'true'
AI_CATALOG_VISUAL_MIN_SCORE = float(os.getenv('AI_CATALOG_VISUAL_MIN_SCORE', '0.58'))
AI_CATALOG_VISUAL_LIVE_MIN_SCORE = float(os.getenv('AI_CATALOG_VISUAL_LIVE_MIN_SCORE', '0.62'))
AI_CATALOG_VISUAL_MIN_MARGIN = float(os.getenv('AI_CATALOG_VISUAL_MIN_MARGIN', '0.06'))
AI_LIVE_SIGN_COLOR_MIN = float(os.getenv('AI_LIVE_SIGN_COLOR_MIN', '0.05'))
AI_LIVE_SIGN_BLOB_MIN = float(os.getenv('AI_LIVE_SIGN_BLOB_MIN', '0.025'))
AI_LIVE_SKIN_MAX = float(os.getenv('AI_LIVE_SKIN_MAX', '0.38'))
AI_LIVE_EDGE_MIN = float(os.getenv('AI_LIVE_EDGE_MIN', '0.008'))
AI_IMGSZ = int(os.getenv('AI_IMGSZ', '640'))
AI_UPLOAD_YOLO_FLOOR = float(os.getenv('AI_UPLOAD_YOLO_FLOOR', '35'))
AI_HYBRID_CONFIDENCE_THRESHOLD = float(os.getenv('AI_HYBRID_CONFIDENCE_THRESHOLD', '70'))
AI_GEMINI_UPLOAD_FALLBACK = os.getenv('AI_GEMINI_UPLOAD_FALLBACK', 'False').lower() == 'true'
AI_GEMINI_LIVE_FALLBACK = os.getenv('AI_GEMINI_LIVE_FALLBACK', 'False').lower() == 'true'
AI_GEMINI_LIVE_MIN_INTERVAL = float(os.getenv('AI_GEMINI_LIVE_MIN_INTERVAL', '0.8'))
AI_UPLOAD_MAX_EDGE = int(os.getenv('AI_UPLOAD_MAX_EDGE', '1280'))
AI_WARMUP_MODELS = os.getenv('AI_WARMUP_MODELS', 'True').lower() == 'true'

# Vehicle detection (YOLOv8 COCO pretrained — separate from sign model)
AI_VEHICLE_ENABLED = os.getenv('AI_VEHICLE_ENABLED', 'True').lower() == 'true'
AI_VEHICLE_MODEL = os.getenv('AI_VEHICLE_MODEL', 'yolov8n.pt')
AI_VEHICLE_CONFIDENCE_THRESHOLD = float(os.getenv('AI_VEHICLE_CONFIDENCE_THRESHOLD', '0.35'))
AI_VEHICLE_TRACKING_ENABLED = os.getenv('AI_VEHICLE_TRACKING_ENABLED', 'True').lower() == 'true'
AI_VEHICLE_TRACK_SESSION_TTL = int(os.getenv('AI_VEHICLE_TRACK_SESSION_TTL', '300'))
AI_VEHICLE_TRACK_MAX_SESSIONS = int(os.getenv('AI_VEHICLE_TRACK_MAX_SESSIONS', '12'))

# License plate OCR (EasyOCR — Latin/Khmer-style Cambodia plates)
AI_PLATE_OCR_ENABLED = os.getenv('AI_PLATE_OCR_ENABLED', 'True').lower() == 'true'
AI_PLATE_OCR_MIN_CONFIDENCE = float(os.getenv('AI_PLATE_OCR_MIN_CONFIDENCE', '0.45'))
AI_PLATE_OCR_LANGUAGES = [
    lang.strip()
    for lang in os.getenv('AI_PLATE_OCR_LANGUAGES', 'en').split(',')
    if lang.strip()
]
AI_PLATE_OCR_FAST_MODE = os.getenv('AI_PLATE_OCR_FAST_MODE', 'True').lower() == 'true'
AI_PLATE_OCR_EARLY_EXIT_CONF = float(os.getenv('AI_PLATE_OCR_EARLY_EXIT_CONF', '0.82'))

# Full pipeline: auto-evaluate violations on detect (defense demo)
AI_PIPELINE_DEMO_VIOLATION = os.getenv('AI_PIPELINE_DEMO_VIOLATION', 'False').lower() == 'true'
AI_PIPELINE_AUTO_CREATE_VIOLATION = os.getenv('AI_PIPELINE_AUTO_CREATE_VIOLATION', 'True').lower() == 'true'

# Enterprise v2 — optional FastAPI ai-vision-service (see services/ai-vision-service/)
AI_VISION_SERVICE_URL = os.getenv('AI_VISION_SERVICE_URL', '').strip()
# Thesis alias — prefer explicit AI_SERVICE_URL when set
AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', '').strip() or AI_VISION_SERVICE_URL
if AI_SERVICE_URL and not AI_VISION_SERVICE_URL:
    AI_VISION_SERVICE_URL = AI_SERVICE_URL

# Enterprise v2 — optional OCR microservice (see services/ocr-service/)
OCR_SERVICE_URL = os.getenv('OCR_SERVICE_URL', '').strip()

# Enterprise v2 — optional RTSP stream gateway (see services/stream-gateway/)
STREAM_GATEWAY_URL = os.getenv('STREAM_GATEWAY_URL', '').strip()

# Gemini Vision — optional backup only (AI_DETECTION_MODE=hybrid + flags below)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_ENABLED = os.getenv('GEMINI_ENABLED', 'False').lower() == 'true'
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
GEMINI_REQUEST_TIMEOUT = int(os.getenv('GEMINI_REQUEST_TIMEOUT', '30'))
GEMINI_BACKOFF_SECONDS = int(os.getenv('GEMINI_BACKOFF_SECONDS', '60'))

# Neural TTS (edge-tts — Khmer + English; needs internet)
TTS_ENABLED = os.getenv('TTS_ENABLED', 'True').lower() == 'true'
TTS_VOICE = os.getenv('TTS_VOICE', 'km-KH-SreymomNeural')
TTS_VOICE_EN = os.getenv('TTS_VOICE_EN', 'en-US-JennyNeural')
TTS_RATE = os.getenv('TTS_RATE', '-5%')

# Password reset (user portal)
FRONTEND_PASSWORD_RESET_URL = os.getenv(
    'FRONTEND_PASSWORD_RESET_URL',
    'http://localhost:5173/reset-password',
)
FRONTEND_EMAIL_VERIFY_URL = os.getenv(
    'FRONTEND_EMAIL_VERIFY_URL',
    'http://localhost:5173/verify-email',
)

# Login brute-force protection (SecurityHardeningMiddleware)
LOGIN_RATE_LIMIT_MAX = int(os.getenv('LOGIN_RATE_LIMIT_MAX', '10'))
LOGIN_RATE_LIMIT_WINDOW = int(os.getenv('LOGIN_RATE_LIMIT_WINDOW', '300'))

# OpenAPI / Swagger (enable in production with ENABLE_API_DOCS=true)
ENABLE_API_DOCS = os.getenv('ENABLE_API_DOCS', 'True' if DEBUG else 'False').lower() == 'true'

SPECTACULAR_SETTINGS = {
    'TITLE': 'CamTraffic API',
    'DESCRIPTION': (
        'REST API for the AI-Based Traffic Sign Detection and Traffic Law Enforcement System (Cambodia). '
        'Authenticate with JWT Bearer token from POST /api/auth/login/.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api',
    'SECURITY': [{'BearerAuth': []}],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'BearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            },
        },
    },
    'TAGS': [
        {'name': 'auth', 'description': 'Login, register, profile, OAuth'},
        {'name': 'dashboard', 'description': 'Analytics and reports'},
        {'name': 'ai', 'description': 'Sign detection and OCR'},
        {'name': 'rbac', 'description': 'Roles and permissions (admin)'},
    ],
}

# Secure cookies in production
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False' if DEBUG else 'True').lower() == 'true'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False' if DEBUG else 'True').lower() == 'true'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Resend (https://resend.com) — preferred for password reset / resend emails
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', '')  # e.g. CamTraffic <onboarding@resend.dev>

# Email (SMTP fallback) — Gmail App Password, etc.
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 30))
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', '') or EMAIL_HOST_USER or 'noreply@camtraffic.kh'

# ── Live payments (Stripe + KHQR / manual proof) ───────────────────────────────
# PAYMENT_MODE: manual | stripe | khqr | live | auto
PAYMENT_MODE = os.getenv('PAYMENT_MODE', 'manual')
PAYMENT_CURRENCY = os.getenv('PAYMENT_CURRENCY', 'usd')
PAYMENT_MANUAL_PROOF_ENABLED = os.getenv('PAYMENT_MANUAL_PROOF_ENABLED', 'True').lower() == 'true'
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
STRIPE_SUCCESS_URL = os.getenv(
    'STRIPE_SUCCESS_URL',
    'http://localhost:5173/citizen/fines?paid=1',
)
STRIPE_CANCEL_URL = os.getenv(
    'STRIPE_CANCEL_URL',
    'http://localhost:5173/citizen/fines?cancel=1',
)
KHQR_MERCHANT_NAME = os.getenv('KHQR_MERCHANT_NAME', '')
KHQR_MERCHANT_ACCOUNT = os.getenv('KHQR_MERCHANT_ACCOUNT', '')
KHQR_MERCHANT_ACCOUNT_KHR = os.getenv('KHQR_MERCHANT_ACCOUNT_KHR', '')
# Static ABA KHQR PNG served by user/admin SPA (public/payments/aba-khqr.png)
KHQR_QR_IMAGE_URL = os.getenv('KHQR_QR_IMAGE_URL', '/payments/aba-khqr.png')

LOGGING = build_logging_config(
    BASE_DIR,
    use_json=os.getenv('JSON_LOGS', 'False').lower() == 'true',
)

# ── Production safety checks ───────────────────────────────────────────────────
_DEV_SECRET_KEYS = frozenset({
    'django-insecure-dev-only-change-in-production',
    'change-me-to-a-long-random-secret-key',
})


def _validate_production_settings() -> None:
    if DEBUG:
        return
    from django.core.exceptions import ImproperlyConfigured

    if SECRET_KEY in _DEV_SECRET_KEYS or len(SECRET_KEY) < 40:
        raise ImproperlyConfigured(
            'SECRET_KEY must be a strong random value (40+ chars) when DEBUG=False.'
        )
    if USE_SQLITE:
        raise ImproperlyConfigured(
            'USE_SQLITE must be False in production. Configure PostgreSQL (USE_SQLITE=False).'
        )


_validate_production_settings()
