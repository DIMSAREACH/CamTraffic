"""Supported API locales for CamTraffic."""

from django.conf import settings

SUPPORTED_LOCALES = [
    {
        'code': code,
        'label': label,
        'default': code == settings.LANGUAGE_CODE.split('-')[0],
    }
    for code, label in settings.LANGUAGES
]

DEFAULT_LOCALE = settings.LANGUAGE_CODE.split('-')[0]
