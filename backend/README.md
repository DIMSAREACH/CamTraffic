# CamTraffic Backend

Django REST API for the AI-Based Traffic Sign Detection and Traffic Law Enforcement System.

## Project Structure

```text
backend/
├── config/
│   ├── settings/
│   │   ├── base.py           # Shared settings
│   │   ├── development.py    # Local / Docker dev
│   │   └── production.py     # Production overrides
│   ├── api_urls.py           # /api/v1/ route registry
│   ├── urls.py               # Root URL config
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── core/                 # Health, API root, base models
│   ├── accounts/             # Custom User model (AUTH_USER_MODEL)
│   ├── rbac/                 # Roles & permissions
│   ├── users/                # User profiles
│   ├── officers/             # Traffic officers
│   ├── drivers/              # Drivers
│   ├── vehicles/             # Vehicles
│   ├── cameras/              # Cameras
│   ├── traffic_signs/        # Traffic sign catalog
│   ├── ai_models/            # AI model metadata
│   ├── detections/           # Detection results
│   ├── ocr/                  # OCR results
│   ├── violations/           # Violations
│   ├── fines/                # Fines
│   ├── appeals/              # Appeals
│   ├── reports/              # Reports
│   ├── notifications/        # Notifications
│   ├── dashboard/            # Dashboard stats
│   ├── audit/                # Audit logs
│   └── system/               # System settings
├── scripts/
│   └── scaffold_apps.py      # Regenerate app boilerplate
├── manage.py
└── requirements.txt
```

## Setup (Local)

```bash
# 1. Start PostgreSQL (Docker — port 5434 on Windows to avoid local PG on 5432)
npm run docker:postgres

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_database   # roles, signs, stations, admin user
python manage.py createsuperuser
python manage.py runserver
```

> **Windows note:** If `migrate` fails with `failed to resolve host 'postgres'`, use `POSTGRES_HOST=localhost` in `.env` (already the default). If you get password errors on port 5432, another PostgreSQL is running locally — use `POSTGRES_PORT=5434` and `npm run docker:postgres`.

## Settings

| Environment | `DJANGO_SETTINGS_MODULE` |
|-------------|--------------------------|
| Development | `config.settings.development` |
| Production | `config.settings.production` |

Environment variables are loaded from the monorepo root `.env` file.

## API Endpoints (Task 004 / 007)

| Endpoint | Description |
|----------|-------------|
| `GET /health/` | Liveness probe (Docker) |
| `GET /health/ready/` | Readiness — Postgres + Redis |
| `GET /api/v1/` | API root metadata |
| `GET /api/v1/health/` | API liveness |
| `GET /api/v1/health/?full=1` | API readiness |
| `GET /api/v1/monitoring/status/` | Operator monitoring |
| `GET /api/v1/auth/` | Auth module (Task 011) |
| `GET /api/v1/users/` | Users module (Task 092) |
| `GET /api/v1/...` | Other modules — placeholder 501 |

## Custom User Model

`AUTH_USER_MODEL = 'accounts.User'`

Roles: `super_admin`, `admin`, `officer`, `driver`

## Docker

```bash
# From project root
npm run docker:up
```

Backend: http://localhost:8000/api/v1/

## Commands

```bash
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
python scripts/scaffold_apps.py
```
