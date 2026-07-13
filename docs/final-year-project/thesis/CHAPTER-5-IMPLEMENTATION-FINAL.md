# Chapter 5 — Implementation

**CamTraffic Final Year Project**

---

## 5.1 Implementation Overview

CamTraffic was implemented as a monorepo containing Django backend, two React frontends, shared TypeScript packages, AI training assets, and deployment configuration. Implementation spanned Phases 1–11 of the project checklist with approximately 400+ completed tasks preceding this thesis phase.

Technology stack:

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, Django 5, DRF, Celery |
| Database | PostgreSQL 16 (SQLite dev) |
| Cache/Queue | Redis 7 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| AI | Ultralytics YOLO11n, EasyOCR |
| Production | Gunicorn, Nginx, Docker Compose |

---

## 5.2 Backend Implementation

### 5.2.1 Project Structure

Django project `camtraffic` mounts 16 apps through `camtraffic/api_urls.py`. Each app follows models → serializers → views → urls pattern.

### 5.2.2 Authentication Module

`authentication` app implements:

- JWT login/register/refresh/logout (blacklist on logout)  
- Password reset via email (Resend SMTP)  
- Email verification workflow  
- Optional Google/GitHub OAuth  
- Profile management with preferences and session control  

Key endpoints: `/api/auth/login/`, `/api/auth/profile/`, `/api/auth/verify-email/confirm/`

### 5.2.3 Enforcement Modules

| App | Key models | Key endpoints |
|-----|------------|---------------|
| violations | ViolationRule, TrafficViolation | `/api/violations/`, `/api/violations/evaluate/` |
| fines | Fine | `/api/fines/`, `/api/fines/<id>/pay/` |
| appeals | Appeal | `/api/appeals/<id>/review/` |
| unknown_vehicles | UnknownVehicle | `/api/unknown-vehicles/` |

### 5.2.4 AI Detection Module

`ai_detection/pipeline_enforcement.py` orchestrates:

```python
# Simplified flow
signs = yolo_model.predict(image)
plates = ocr_engine.read(vehicle_crop)  # when bbox present
violation = match_violation_rule(signs, observed_action)
save_detection_log(...)
if auto_create and violation:
    create_violation_and_fine(...)
```

Configuration via environment variables: `AI_MODEL_PATH`, `AI_USE_MOCK`, `AI_DETECTION_MODE`.

Views: `DetectSignView`, `ProcessFrameView`, `DetectionLogListView`

### 5.2.5 Dashboard and Reporting

`dashboard` app aggregates KPIs per role and generates PDF reports via ReportLab. Excel export uses openpyxl. System backup packages database dump + media into ZIP.

---

## 5.3 Frontend Implementation

### 5.3.1 Admin Portal (`frontend-admin`)

Routes defined in `routes.tsx`. Key pages:

- AdminDashboard — KPI widgets with 30s polling  
- UsersPage, OfficersPage, RolesPage — identity management  
- Cameras, Roads — infrastructure CRUD  
- AiDetectionPage — upload test interface  
- SystemSettingsPage, BackupRestorePage — ops tools  

Layout: `AdminLayout` with sidebar navigation and profile avatar component.

### 5.3.2 User Portal (`frontend-user`)

Dual-role login via Officer/Driver tabs on authentication page. Routes:

- Dashboard (role-specific KPIs)  
- AiDetection — officer enforcement UI  
- Violations, Fines, Appeals — workflow pages  
- Vehicles — driver registration  
- Notifications — bell dropdown  

### 5.3.3 Shared Infrastructure

- `shared/services/api.ts` — Axios with JWT interceptors  
- `shared/context/LanguageContext` — Khmer/English toggle  
- `@camtraffic/types`, `@camtraffic/ui` — workspace packages  

---

## 5.4 AI Model Integration

Production weights: `ai/weights/best_v2.pt` (10 epochs, 10 classes)

Integration points:

1. Django loads model on first request (lazy singleton)  
2. Mock mode returns deterministic JSON for CI/tests  
3. Detection logs store class key, confidence, image path  
4. `ai_models` app registers version history and active model pointer  

Training scripts and dataset configs reside under `ai/` with run artifacts in `ai/runs/detect/`.

---

## 5.5 Production Infrastructure

Docker files:

- `deploy/docker/Dockerfile.backend.prod`  
- `deploy/docker/Dockerfile.nginx.prod` (builds both SPAs)  
- `deploy/docker/docker-compose.prod.yml`  

Gunicorn config: 4 workers, 2 threads, 120s timeout (`deploy/gunicorn/gunicorn.conf.py`)

CI pipeline: `.github/workflows/ci.yml` — validate, test, Docker build

---

## 5.6 Implementation Challenges and Resolutions

| Challenge | Resolution |
|-----------|------------|
| Celery on Windows | Document `--pool=solo`; production uses Linux containers |
| Docker path spaces (Windows) | Quoted compose wrapper in bash scripts |
| node_modules platform mismatch | Root `.dockerignore` + `npm ci` in nginx build |
| Low OCR exact-match rate | Officer confirmation step; documented limitation |
| Cross-origin dev setup | Vite proxy to Django backend |

---

## 5.7 Screenshot Placeholders

Insert the following figures in the Word/PDF thesis export:

| Figure | Description | Source |
|--------|-------------|--------|
| 5.1 | Admin dashboard KPI view | Admin portal screenshot |
| 5.2 | AI detection result with bounding boxes | AI Detection page |
| 5.3 | Driver fines and payment tab | User portal |
| 5.4 | Fine PDF receipt | `/api/fines/<id>/pdf/` output |
| 5.5 | Live camera grid | Admin Cameras page |

---

## 5.8 Summary

Chapter 5 documented backend apps, frontend portals, AI integration, and deployment implementation. Chapter 6 presents testing and evaluation results.

---

**Word count (approx.):** 750 · **Status:** Final submission version
