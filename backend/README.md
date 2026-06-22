# CamTraffic — Django Backend Foundation

Django REST Framework API for the AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia.

> **Scope:** Foundation layer only — models, auth, RBAC, PostgreSQL, Redis, Docker.  
> Business logic (views, services, ingest APIs) lives in existing apps and will be extended in later sprints.

---

## Stack

| Component | Technology |
| --- | --- |
| Framework | Django 4.2 + DRF |
| Auth | SimpleJWT (access + refresh + blacklist) |
| Database | PostgreSQL 16 (SQLite for local dev) |
| Cache / Queue | Redis 7 + Celery 5 |
| WSGI | Gunicorn |

---

## Apps Structure

```text
backend/
├── camtraffic/          # Project settings, urls, celery
├── core/                # Permissions, pagination, exceptions
├── authentication/      # JWT login, OAuth, password reset
├── users/               # User, Driver, Officer (custom User model)
├── rbac/                # Role, Permission, RolePermission, UserRole
├── vehicles/            # Vehicle registry
├── infrastructure/      # Road, Camera, TrafficSignal
├── traffic_signs/       # Sign catalog
├── violations/          # ViolationRule, TrafficViolation
├── fines/               # Fine records
├── ai_detection/        # AI pipeline (existing — not part of this foundation pass)
├── notifications/       # In-app notifications
├── dashboard/           # Analytics aggregations
│
├── appeals/             # ★ NEW — ViolationAppeal model
├── audit/               # ★ NEW — AuditLog model
├── unknown_vehicles/    # ★ NEW — UnknownVehicle queue
└── ai_models/           # ★ NEW — AIModelVersion registry
```

### Role mapping (PRD)

| PRD role | `User.role` | Permission class |
| --- | --- | --- |
| Admin | `admin` | `IsAdmin` |
| Officer | `police` | `IsPolice` / `IsOfficer` |
| Citizen | `driver` | `IsDriver` / `IsCitizen` |

---

## Custom User Model

```python
AUTH_USER_MODEL = 'users.User'
```

- Login field: `email` (no username)
- Roles: `admin`, `police`, `driver`
- Profiles: `Officer` (1:1 police), `Driver` (1:1 citizen)

---

## Local Development (no Docker required)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Git Bash / Linux
# venv\Scripts\activate        # PowerShell / CMD
pip install -r requirements.txt
cp .env.example .env             # Git Bash / Linux
# copy .env.example .env         # PowerShell / CMD
python manage.py migrate
python manage.py create_admin
python manage.py runserver
```

Set `USE_SQLITE=True` in `.env` for quick start without PostgreSQL.

---

## Docker (PostgreSQL + Redis + Backend + Celery)

**Prerequisite:** [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) must be installed and running.  
If `docker: command not found`, Docker is not installed or not on your PATH — use **Local Development** above instead.

```bash
# From project root (Git Bash)
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
docker compose exec backend python manage.py create_admin
```

PowerShell/CMD: replace `cp` with `copy` or `Copy-Item`.

API: http://localhost:8000/api/

---

## Migrations

After model changes:

```bash
python manage.py makemigrations users vehicles infrastructure fines appeals audit unknown_vehicles ai_models
python manage.py migrate
```

---

## Foundation Models Added (PRD alignment)

| Table | App | Status |
| --- | --- | --- |
| `violation_appeals` | appeals | Model + admin |
| `audit_logs` | audit | Model + admin (read-only) |
| `unknown_vehicles` | unknown_vehicles | Model + admin |
| `ai_model_versions` | ai_models | Model + admin |
| KYC fields on `drivers` | users | Migration |
| Payment fields on `fines` | fines | Migration |
| Camera telemetry | infrastructure | Migration |

**No API endpoints** added for new apps in this foundation pass.

---

## Related Docs

- [docs/architecture/BACKEND_ARCHITECTURE.md](../docs/architecture/BACKEND_ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)
- [API_SPEC.md](../API_SPEC.md)
