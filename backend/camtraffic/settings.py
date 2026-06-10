"""
CamTraffic Django settings — production-ready with env-based configuration.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

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
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
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
        }
    }

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

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174',
    ).split(',')
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# OAuth (Google / GitHub) — user portal social login
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
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# AI module
AI_MODEL_PATH = os.getenv('AI_MODEL_PATH', str(BASE_DIR.parent / 'ai' / 'weights' / 'best.pt'))
AI_USE_MOCK = os.getenv('AI_USE_MOCK', 'False').lower() == 'true'
AI_CONFIDENCE_THRESHOLD = float(os.getenv('AI_CONFIDENCE_THRESHOLD', '0.35'))
AI_MIN_RESULT_CONFIDENCE = float(os.getenv('AI_MIN_RESULT_CONFIDENCE', '35'))
AI_ABSOLUTE_YOLO_FLOOR = float(os.getenv('AI_ABSOLUTE_YOLO_FLOOR', '18'))
AI_LIVE_YOLO_FLOOR = float(os.getenv('AI_LIVE_YOLO_FLOOR', '10'))
AI_UPLOAD_YOLO_FLOOR = float(os.getenv('AI_UPLOAD_YOLO_FLOOR', '5'))
AI_HYBRID_CONFIDENCE_THRESHOLD = float(os.getenv('AI_HYBRID_CONFIDENCE_THRESHOLD', '70'))
AI_WARMUP_MODELS = os.getenv('AI_WARMUP_MODELS', 'True').lower() == 'true'

# Vehicle detection (YOLOv8 COCO pretrained — separate from sign model)
AI_VEHICLE_ENABLED = os.getenv('AI_VEHICLE_ENABLED', 'True').lower() == 'true'
AI_VEHICLE_MODEL = os.getenv('AI_VEHICLE_MODEL', 'yolov8n.pt')
AI_VEHICLE_CONFIDENCE_THRESHOLD = float(os.getenv('AI_VEHICLE_CONFIDENCE_THRESHOLD', '0.35'))

# License plate OCR (EasyOCR — Latin/Khmer-style Cambodia plates)
AI_PLATE_OCR_ENABLED = os.getenv('AI_PLATE_OCR_ENABLED', 'True').lower() == 'true'
AI_PLATE_OCR_MIN_CONFIDENCE = float(os.getenv('AI_PLATE_OCR_MIN_CONFIDENCE', '0.45'))
AI_PLATE_OCR_LANGUAGES = [
    lang.strip()
    for lang in os.getenv('AI_PLATE_OCR_LANGUAGES', 'en').split(',')
    if lang.strip()
]

# Full pipeline: auto-evaluate violations on detect (defense demo)
AI_PIPELINE_DEMO_VIOLATION = os.getenv('AI_PIPELINE_DEMO_VIOLATION', 'True').lower() == 'true'
AI_PIPELINE_AUTO_CREATE_VIOLATION = os.getenv('AI_PIPELINE_AUTO_CREATE_VIOLATION', 'True').lower() == 'true'

# Gemini Vision fallback (when YOLO confidence is below hybrid threshold)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_ENABLED = os.getenv('GEMINI_ENABLED', 'True').lower() == 'true'
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
GEMINI_REQUEST_TIMEOUT = int(os.getenv('GEMINI_REQUEST_TIMEOUT', '30'))
GEMINI_BACKOFF_SECONDS = int(os.getenv('GEMINI_BACKOFF_SECONDS', '60'))

# Khmer TTS (edge-tts — works without Windows Khmer voice; needs internet)
TTS_ENABLED = os.getenv('TTS_ENABLED', 'True').lower() == 'true'
TTS_VOICE = os.getenv('TTS_VOICE', 'km-KH-SreymomNeural')

# Password reset (user portal)
FRONTEND_PASSWORD_RESET_URL = os.getenv(
    'FRONTEND_PASSWORD_RESET_URL',
    'http://localhost:5173/reset-password',
)

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

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'camtraffic.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

(BASE_DIR / 'logs').mkdir(exist_ok=True)
