# Django Translation Catalogs

Backend translation files for Khmer and English live here.

## Structure

```text
locale/
├── en/LC_MESSAGES/django.po
└── km/LC_MESSAGES/django.po
```

Generate or update catalogs with:

```bash
cd backend
python manage.py makemessages -l en -l km
python manage.py compilemessages
```

## API

Supported locales are also exposed at `GET /api/v1/system/locales/`.
