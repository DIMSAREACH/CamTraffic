# Thesis Architecture Alignment

**Title:** Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia.

This document maps the thesis prompt’s folder names to the **existing CamTraffic monorepo** (v1.0, July 2026).

## Requested vs actual layout

| Thesis prompt | CamTraffic location | Status |
|---------------|---------------------|--------|
| `frontend/` | `frontend-admin/` + `frontend-user/` (+ `frontend/README.md` pointer) | ✅ Complete |
| `backend/` | `backend/` (Django 5 + DRF + SimpleJWT + Celery) | ✅ Complete |
| `ai_service/` | `ai_service/` (new thesis FastAPI) + `services/ai-vision-service/` | ✅ Complete |
| `mobile_api/` | `mobile_api/` → mounted at `/api/mobile/` | ✅ Complete |

## Roles (RBAC)

| Thesis role | System role |
|-------------|-------------|
| Super Admin | `admin` + `is_superuser` |
| Traffic Admin | `admin` |
| Officer | `police` |
| Driver/User | `driver` |

## API contract mapping

| Thesis endpoint | Implemented |
|-----------------|-------------|
| `POST /api/auth/register` | `/api/auth/register/` |
| `POST /api/auth/login` | `/api/auth/login/` |
| `POST /api/auth/refresh` | `/api/auth/refresh/` |
| `POST /api/auth/logout` | `/api/auth/logout/` |
| `POST /api/ai/detect/image` | `/api/ai/detect/` (+ `ai_service` `/detect/image`) |
| `POST /api/ai/detect/video` | `/api/ai/detect-video/` |
| `POST /api/ai/detect/webcam` | `/api/ai/capture-webcam/` / `process-frame/` |
| `POST /api/ai/detect/live` | live camera panels + `ai_service` `/detect/live` |
| `GET /api/ai/history` | `/api/ai/logs/` |
| Violations / fines / appeals / vehicles / cameras | under `/api/` (see `backend/camtraffic/api_urls.py`) |
| `GET /api/reports/*` | `/api/reports/dashboard|violations|fines|export/csv|export/pdf/` |
| Mobile | `/api/mobile/*` |

## Business rules

| Rule | Where enforced |
|------|----------------|
| Officer approves before fine | `mobile_api` approve + violations workflow |
| Fine cannot be paid twice | fines payment views (status guard) |
| One appeal per violation | appeals + mobile appeals create |
| Unknown vehicles → review | `unknown_vehicles` app |
| Audit on mutations | `audit` / `core.audit_service.log_audit` |

## Quick start (full stack)

```bash
# 1. Env
node scripts/setup-env.mjs

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver

# 3. AI service (mock OK without GPU weights)
cd ..\ai_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set AI_MOCK_MODE=true
uvicorn api:app --port 8090

# 4. Frontends
cd ..
npm run install:frontends
npm run dev
```

Or Docker:

```bash
docker compose up -d --build
# AI thesis service: http://localhost:8090/docs
```
