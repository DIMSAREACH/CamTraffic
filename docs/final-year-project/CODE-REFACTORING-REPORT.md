# Code Refactoring Report

**Task 417** · CamTraffic Final Year Project  
**Date:** 2026-07-12

---

## 1. Executive summary

Refactoring focused on **stabilization for thesis submission** rather than large architectural rewrites. Key themes: UUID schema alignment, shared API URL consolidation, deployment script robustness, and test structure for Phase 12.

| Area | Refactors | Risk |
|------|----------:|:----:|
| Backend | 12 | Low |
| Frontend | 8 | Low |
| Deploy / scripts | 6 | Low |
| AI pipeline | 3 | Low |
| Docs | Consolidation | None |

**No breaking API changes** in v1.0.0 release candidate.

---

## 2. Backend refactoring

### 2.1 API route consolidation

**Before:** Scattered URL includes in `camtraffic/urls.py`  
**After:** Single `camtraffic/api_urls.py` mounted at `/api/` and `/api/v1/`

**Benefit:** One source of truth for frontend integration; easier OpenAPI future work.

### 2.2 UUID primary keys

**Change:** Core models migrated to `UUIDPrimaryKeyModel`  
**Files:** `backend/core/models.py`, alignment migrations in 16 apps  
**Benefit:** Safer distributed IDs; matches production PostgreSQL design.

### 2.3 AI pipeline extraction

**Change:** Detection logic centralized in `pipeline_enforcement.py`  
**Before:** Inline inference scattered in views  
**After:** Single orchestration module called by `DetectSignView` and `ProcessFrameView`

### 2.4 Permissions layer

**Change:** RBAC permissions in `rbac/permissions.py`; role checks in `core/permissions.py`  
**Benefit:** Consistent authorization across 120 API routes.

### 2.5 Production settings split

**Change:** `settings_production.py` + `config/logging.py` + `config/monitoring.py`  
**Benefit:** Dev/prod separation without duplicating base settings.

---

## 3. Frontend refactoring

### 3.1 Shared services

API client unified in `frontend-*/shared/services/api.ts` with JWT refresh interceptor—removed duplicate axios setup per portal.

### 3.2 Route modules

Admin and user routes isolated in `routes.tsx` with lazy-loaded pages where appropriate.

### 3.3 i18n consolidation

Language strings in `shared/locales/en.json` and `km.json`; `LanguageContext` shared across portals.

### 3.4 Workspace packages

Extracted `@camtraffic/types`, `@camtraffic/ui`, `@camtraffic/utils` to `packages/`—reduced copy-paste between frontends.

---

## 4. Deployment refactoring

| Change | File |
|--------|------|
| Quoted compose wrapper | `deploy/scripts/_compose.sh` |
| Auto env bootstrap | `scripts/docker-prod.mjs` |
| Cross-platform dockerignore | `.dockerignore` |
| Gunicorn config extracted | `deploy/gunicorn/gunicorn.conf.py` |

---

## 5. Test structure refactoring

**Phase 12 layout:**

```
backend/tests/
├── api/
├── integration/
├── security/
└── backend/

tests/
├── e2e/
├── frontend-admin/
└── frontend-user/
```

**Benefit:** Clear separation of unit, API, security, integration, and E2E concerns.

---

## 6. Intentionally not refactored

| Item | Reason |
|------|--------|
| Phase 18 `packages/ui` redesign | Project decision: keep existing shared UI |
| Microservices split | Out of thesis scope; monolith sufficient |
| Full OpenAPI / drf-spectacular | Deferred to v1.1 |
| OCR engine swap (PaddleOCR) | Requires new evaluation cycle |

---

## 7. Metrics

| Metric | Before (Phase 4) | After (Phase 17) |
|--------|------------------|------------------|
| Django apps | 12 | 16 |
| Documented API routes | ~60 | ~120 |
| Automated test files | ~5 | 25+ |
| Docker services (prod) | 3 | 8 |

---

## 8. Recommendations for v1.1

1. Extract `ai_detection` inference to async Celery task for long-running uploads  
2. Add `drf-spectacular` for auto-generated OpenAPI  
3. Consolidate duplicate serializer patterns with base mixins  
4. Type-safe API client codegen from OpenAPI for frontends  

---

*Code refactoring report — Phase 17 Task 417*
