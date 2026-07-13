# CamTraffic — Developer Guide

**Version:** 1.0 · **Date:** July 2026  
**Audience:** Contributors extending backend, frontend, or AI modules

---

## 1. Repository layout

```
CamTraffic/
├── backend/           # Django REST API
├── frontend-admin/    # Admin portal (React + Vite)
├── frontend-user/     # Driver/officer portal
├── packages/          # Shared TypeScript packages
├── ai/                # YOLO training scripts & weights
├── deploy/            # Production Docker & scripts
├── tests/             # Cross-stack tests (E2E, integration)
└── docs/              # Project documentation
```

See `docs/FOLDER-MAP.md` for full tree.

---

## 2. Monorepo packages (`packages/`)

| Package | Purpose | Import |
|---------|---------|--------|
| `@camtraffic/types` | Shared TypeScript interfaces | `import type { User } from '@camtraffic/types'` |
| `@camtraffic/api` | API client helpers | Used by frontends |
| `@camtraffic/hooks` | React hooks (auth, fetch) | Portal-specific wrappers |
| `@camtraffic/ui` | Shared UI tokens/components | Theme, buttons |
| `@camtraffic/utils` | Formatting, date helpers | Cross-portal utilities |

Install workspace deps from root:

```bash
npm run install:frontends
```

Each package has `package.json` + `tsconfig.json`. Frontends reference packages via workspace protocol in root `package.json`.

---

## 3. Backend development

### 3.1 App structure

Each Django app follows:

```
backend/<app>/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── migrations/
└── tests/           # optional
```

### 3.2 Adding an API endpoint

1. Define serializer in `<app>/serializers.py`
2. Add view in `<app>/views.py` with permission class from `core.permissions` or `rbac.permissions`
3. Register route in `<app>/urls.py`
4. Ensure app is included in `backend/camtraffic/api_urls.py`
5. Document in `backend/docs/API.md`
6. Add test in `backend/tests/`

### 3.3 Permissions

| Class | Use |
|-------|-----|
| `IsAdmin` | Admin-only mutations |
| `IsPoliceOrAdmin` | Enforcement actions |
| `IsDriverOrAdmin` | Driver-scoped reads |

RBAC fine-grained checks: `rbac.permissions.HasPermission`.

### 3.4 AI detection pipeline

Entry: `backend/ai_detection/views.py` → `DetectSignView`  
Pipeline: `backend/ai_detection/pipeline_enforcement.py`

Local YOLO loads from `AI_MODEL_PATH`. Mock mode: `AI_USE_MOCK=True`.

### 3.5 Migrations

```bash
cd backend
python manage.py makemigrations <app>
python manage.py migrate
```

Never edit applied migrations in production — create new ones.

---

## 4. Frontend development

### 4.1 Portals

| Portal | Entry | Routes |
|--------|-------|--------|
| Admin | `frontend-admin/main.tsx` | `frontend-admin/routes.tsx` |
| User | `frontend-user/main.tsx` | `frontend-user/routes.tsx` |

Shared code: `frontend-*/shared/` (components, services, hooks).

### 4.2 API client

`shared/services/api.ts` — axios instance with JWT interceptors, refresh on 401.

Env vars (`.env`):

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

### 4.3 Adding a page

1. Create page component in `admin/pages/` or `user/pages/`
2. Register route in `routes.tsx`
3. Add sidebar link in `AdminSidebar.tsx` or user nav
4. Add i18n keys in `shared/locales/en.json` and `km.json`

### 4.4 Styling

Tailwind CSS + shared theme from `@camtraffic/ui`. Follow existing card/table patterns in dashboard pages.

---

## 5. AI / ML development

```bash
cd ai
pip install -r requirements.txt
python train.py --data dataset_10/data.yaml --epochs 100
```

Weights output: `ai/weights/best_v2.pt`  
Training artifacts: `ai/runs/detect/`

Class mapping: violation rules link `detected_class_key` to sign catalog.

---

## 6. Testing

```bash
npm run test:backend:phase12    # Django pytest
npm run test:frontend           # Vitest (both portals)
npm run test:e2e                # Playwright (auto-starts servers)
npm run validate:structure      # Repo layout check
```

E2E config: `tests/e2e/playwright.config.ts` — uses ports 5183/5184.

---

## 7. Code style

| Area | Tool |
|------|------|
| Python | Ruff / Django conventions |
| TypeScript | ESLint + Oxlint (`frontend-admin/.oxlintrc.json`) |
| Formatting | Prettier (`.prettierrc.json`) |

Run before PR:

```bash
npm run lint
cd backend && python -m pytest tests/ -q
```

---

## 8. Environment variables

| File | Purpose |
|------|---------|
| `backend/.env` | Django secrets, DB, AI path |
| `frontend-admin/.env` | Admin portal Vite vars |
| `frontend-user/.env` | User portal Vite vars |
| `deploy/env/.env.production.example` | Production template |

Never commit `.env` files with secrets.

---

## 9. Deployment

Local Docker: `docker compose up`  
Production: `npm run docker:prod:up` → see `deploy/README.md`

CI: `.github/workflows/ci.yml` — validate, test, Docker build on push.

---

## 10. Further reading

| Document | Topic |
|----------|-------|
| `docs/ARCHITECTURE.md` | System design |
| `backend/docs/API.md` | REST catalog |
| `docs/INSTALLATION-GUIDE.md` | Setup |
| `docs/final-year-project/MAINTENANCE-GUIDE.md` | Ops runbook |
