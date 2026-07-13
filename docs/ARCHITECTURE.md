# CamTraffic — System Architecture

**Version:** 1.0 · **Date:** July 2026

---

## 1. Overview

CamTraffic uses a **modular monolith** architecture: a Django REST API hosts business logic and AI inference, with two React (Vite) single-page applications for admin and user roles. Optional Redis and Celery support async tasks. PostgreSQL (or SQLite in dev) stores all enforcement data.

This matches the **actual repository layout**, not a separate microservice AI tier.

---

## 2. Logical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │  Admin Portal        │    │  User Portal         │           │
│  │  frontend-admin      │    │  frontend-user       │           │
│  │  React 19 + Vite     │    │  React 19 + Vite     │           │
│  │  /admin/*            │    │  /dashboard/*        │           │
│  └──────────┬───────────┘    └──────────┬───────────┘           │
└─────────────┼───────────────────────────┼───────────────────────┘
              │         HTTPS / JSON       │
┌─────────────▼───────────────────────────▼───────────────────────┐
│                     API Layer (Django REST)                      │
│  authentication · users · rbac · violations · fines · appeals    │
│  ai_detection · traffic_signs · vehicles · infrastructure      │
│  notifications · dashboard · audit · ai_models                 │
│  /api/*  ·  /health/*                                            │
└─────────────┬───────────────────────────┬───────────────────────┘
              │                           │
┌─────────────▼───────────┐   ┌───────────▼───────────┐
│  AI / Vision Pipeline   │   │  Background Jobs      │
│  YOLO (Ultralytics)     │   │  Celery + Redis       │
│  EasyOCR / plate OCR    │   │  (optional)           │
│  ai/weights/best.pt     │   └───────────────────────┘
└─────────────┬───────────┘
              │
┌─────────────▼───────────────────────────────────────────────────┐
│  Data Layer                                                      │
│  PostgreSQL 16 (prod) / SQLite (dev) · MEDIA files · backups/   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
CamTraffic/
├── backend/                 # Django project
│   ├── camtraffic/          # settings, urls, celery, wsgi
│   ├── authentication/      # JWT, OAuth, password reset
│   ├── users/               # User model (admin/police/driver)
│   ├── ai_detection/        # Detection API + pipeline
│   ├── violations/ fines/ appeals/
│   ├── traffic_signs/ vehicles/ infrastructure/
│   ├── dashboard/ notifications/ audit/ rbac/
│   └── tests/               # Automated tests
├── frontend-admin/          # Admin SPA
│   ├── admin/               # Admin-specific layout/pages
│   └── shared/              # Shared pages, API, styles
├── frontend-user/           # User SPA (police + driver)
│   ├── user/                # User layout/sidebar
│   └── shared/              # Shared with admin (synced copy)
├── ai/                      # Weights, dataset, training runs
│   ├── weights/
│   ├── dataset_10/
│   └── runs/
├── infra/docker/            # Dockerfiles
├── scripts/                 # Dataset & catalog utilities
├── docs/                    # Project documentation
└── docker-compose.yml       # Local stack
```

---

## 4. Technology Stack

| Layer | Technology | Version / notes |
|-------|------------|-----------------|
| Backend framework | Django | 5.x |
| API | Django REST Framework | JSON API |
| Auth | SimpleJWT + OAuth | Access/refresh tokens |
| Database | PostgreSQL / SQLite | UUID PKs on core models |
| Cache / queue | Redis | Celery broker |
| Task worker | Celery | `camtraffic/celery.py` |
| AI — detection | YOLOv11 (Ultralytics) | Weights in `ai/weights/` |
| AI — OCR | EasyOCR (+ optional PaddleOCR scripts) | In detection pipeline |
| Admin UI | React 19, Vite, TypeScript | Port 5174 (dev) |
| User UI | React 19, Vite, TypeScript | Port 5173 (dev) |
| UI components | Radix UI, Tailwind-style CSS | `shared/components/ui/` |
| i18n | Custom LanguageContext | English + Khmer |
| Container | Docker Compose | postgres, redis, backend, celery |
| WSGI (prod) | Gunicorn | Via Docker command |

---

## 5. API Design

- Base path: `/api/` (no `/v1` prefix in current implementation).
- Standard envelope: `success_response()` / `error_response()` in `core/responses.py`.
- Pagination: page number, default 20 items.
- Filtering: query params (`role`, `status`, date range, `search`).
- Auth header: `Authorization: Bearer <access_token>`.

**Major route groups:** `auth`, `users`, `rbac`, `vehicles`, `signs`, `fines`, `appeals`, `violations`, `ai`, `cameras`, `roads`, `notifications`, `dashboard`, `audit`, `ai-models`, `unknown-vehicles`.

---

## 6. Security Architecture

1. **Authentication** — JWT with refresh rotation and blacklist on logout.
2. **Authorization** — DRF permission classes per view; user `role` field + optional RBAC tables.
3. **Transport** — HTTPS in production; CORS whitelist for frontend origins.
4. **Data** — ORM-only DB access; validated file uploads for images.
5. **Audit** — Action logs for sensitive operations.

---

## 7. AI Pipeline (Runtime)

1. Client sends image (multipart) or webcam frame to `POST /api/ai/detect/`.
2. **Vehicle detection** — YOLO locates vehicles/plates if configured.
3. **Sign detection** — YOLO + catalog mapping → sign code, confidence, violation hint.
4. **OCR** — Plate crop → text extraction.
5. **Persistence** — Detection log saved; optional auto-violation/fine creation.
6. **Response** — JSON with bounding boxes, labels, OCR text, enforcement suggestion.

Training and evaluation artifacts live under `ai/runs/` and `docs/reports/`.

---

## 8. Deployment View (Development)

| Service | Port | Image / command |
|---------|------|-----------------|
| frontend-admin | 5174 | `npm run dev` |
| frontend-user | 5173 | `npm run dev` |
| backend | 8000 | Gunicorn / `runserver` |
| PostgreSQL | 5432 | `postgres:16-alpine` |
| Redis | 6379 | `redis:7-alpine` |
| Celery worker | — | `Dockerfile.celery` |

Production nginx / SSL runbooks are planned (Phase 13); not yet in repo.

---

## 9. Design Decisions

| Decision | Rationale |
|----------|-----------|
| Monolithic Django AI | Simpler deployment for thesis; fewer moving parts |
| Dual frontend apps | Separate admin vs user URLs and branding |
| Shared folder copy | `shared/` duplicated in both frontends for independent builds |
| 10-class sign catalog | Focused Cambodian prohibitory/mandatory set for reliable demo |
| UUID primary keys | Alignment with ERD / future federation |

---

## 10. Related Documents

- `docs/SYSTEM-WORKFLOW.md` — Admin, officer, driver, and AI workflows (training vs detection)
- `docs/ARCHITECTURE-DIAGRAMS.md` — UML-style diagrams
- `docs/SRS.md` — Requirements
- `docs/SCHEMA.sql` — Database reference
- `docs/CHECKLIST.md` — Task tracking
