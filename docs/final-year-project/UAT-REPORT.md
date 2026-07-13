# CamTraffic — User Acceptance Testing (UAT) Report

**Date:** 2026-07-12  
**Phase:** 12 — Testing & QA (Tasks 325–340)  
**Environment:** Windows 11 · Python 3.12 · Django 5 · React 19 · SQLite (dev)

## Executive summary

| Category | Result | Notes |
|----------|:------:|-------|
| Authentication (4 roles) | PASS | Admin, police, driver + invalid credentials |
| RBAC enforcement | PASS | Automated + manual matrix |
| CRUD (16 apps) | PASS | Via API tests + admin portal |
| AI detection | PASS | JPEG/PNG/multipart — Task 328 |
| OCR pipeline | PASS | Plate normalize + EasyOCR baseline |
| Reports CSV/PDF | PASS | Task 330 |
| JWT refresh | PASS | Refresh + blacklist on logout |
| SQL injection | PASS | ORM-only queries — Task 335 |
| File upload security | PASS | Non-image MIME rejected — Task 337 |
| Browser compatibility | PASS | Chrome, Edge, Firefox |
| Accessibility | PASS | Keyboard nav + ARIA labels on auth forms |
| Role UAT flows | PASS | Admin, officer, driver flows documented |

---

## 1. Authentication — Task 325

### Test matrix

| Role | Portal | Valid login | Invalid password | Wrong portal |
|------|--------|:-----------:|:----------------:|:------------:|
| Admin | `:5174` | ✅ | ✅ 401 | ✅ driver blocked |
| Police | `:5173` Officer tab | ✅ | ✅ 401 | ✅ admin blocked |
| Driver | `:5173` Driver tab | ✅ | ✅ 401 | ✅ police tab hint |
| Unregistered | either | ✅ 401 | — | — |

**Evidence:** `backend/tests/api/test_health_auth_users.py`, `backend/tests/test_api.py`, Playwright `tests/e2e/`

```bash
cd backend && python manage.py test tests.api.test_health_auth_users tests.test_api.AuthAPITest -v 2
```

---

## 2. RBAC — Task 326

Each role is restricted to permitted endpoints. Admin bypasses RBAC permission checks; drivers receive only assigned permissions.

| Check | Result |
|-------|:------:|
| Driver cannot list users | ✅ |
| Driver cannot access RBAC admin API | ✅ |
| Admin can access RBAC roles | ✅ |
| Legacy role field + RBAC assignment | ✅ |

**Evidence:** `backend/tests/security/test_rbac_authorization.py`, `backend/tests/security/test_security.py`

---

## 3. CRUD — 16 backend apps — Task 327

| App | Create | Read | Update | Delete | Test reference |
|-----|:------:|:----:|:------:|:------:|----------------|
| users | ✅ | ✅ | ✅ | ✅ | `test_api.py`, `test_phase4.py` |
| authentication | ✅ | ✅ | ✅ | — | `test_health_auth_users.py` |
| rbac | ✅ | ✅ | ✅ | ✅ | `test_rbac_authorization.py` |
| infrastructure (roads, cameras) | ✅ | ✅ | ✅ | ✅ | `test_api.InfrastructureAPITest` |
| ai_detection | ✅ | ✅ | — | — | `test_e2e_pipeline.py` |
| ai_models | ✅ | ✅ | ✅ | — | Phase 4 API tests |
| violations | ✅ | ✅ | ✅ | — | `test_e2e_pipeline.py` |
| fines | ✅ | ✅ | ✅ | — | `test_e2e_pipeline.py` |
| vehicles | ✅ | ✅ | ✅ | — | `test_e2e_pipeline.py` |
| traffic_signs | ✅ | ✅ | — | — | `test_e2e_pipeline.py` |
| notifications | ✅ | ✅ | ✅ | — | `test_notification_flow.py` |
| appeals | ✅ | ✅ | — | — | Phase 4 API |
| audit | ✅ | ✅ | — | — | Phase 4 API |
| unknown_vehicles | ✅ | ✅ | — | — | Phase 4 API |
| dashboard | — | ✅ | — | — | `test_auth_dashboard_flow.py` |
| core (settings) | ✅ | ✅ | ✅ | — | Admin portal manual |

---

## 4. AI detection — Task 328 ✅

- **Endpoint:** `POST /api/ai/detect/` (multipart image)
- **Formats tested:** JPEG, PNG via `test_e2e_pipeline.DetectionPipelineTests`
- **Sizes:** 640×480 sample JPEG in test fixture
- **Result:** Pipeline returns sign detections + metadata; non-image rejected with 400

---

## 5. OCR — Task 329

- **Unit tests:** `backend/tests/test_plate_ocr.py` — normalize, province lookup, disabled mode
- **Accuracy baseline:** EasyOCR CER 2.555 → post-processed 2.401 (50 samples)
- **Reference:** `docs/final-year-project/AI-ACCURACY-EVALUATION.md`

---

## 6. Reports — Task 330 ✅

- CSV/Excel export: `backend/tests/test_excel_export.py`
- PDF enforcement report: `backend/tests/test_e2e_pipeline.DashboardReportPDFTests`
- Admin portal: Reports page generates files with real violation/fine data

---

## 7. JWT expiry & refresh — Task 334

| Step | Expected | Result |
|------|----------|:------:|
| Login returns access + refresh | 200 | ✅ |
| Protected route without token | 401 | ✅ |
| Refresh with valid refresh token | New access | ✅ |
| Logout blacklists refresh | Subsequent refresh fails | ✅ |

**Endpoint:** `POST /api/auth/refresh/`  
**Config:** `SIMPLE_JWT` in `backend/camtraffic/settings.py`

---

## 8. SQL injection — Task 335 ✅

All database access uses Django ORM / parameterized `cursor.execute('SELECT 1')` in health checks. No raw string-interpolated SQL in user-facing views.

---

## 9. File upload security — Task 337 ✅

`DetectionPipelineTests` and manual verification reject non-image uploads. DRF parsers validate content type before AI pipeline runs.

---

## 10. Browser compatibility — Task 338

| Browser | Admin portal | User portal | Notes |
|---------|:------------:|:-----------:|-------|
| Chrome 131+ | ✅ | ✅ | Primary dev browser |
| Microsoft Edge | ✅ | ✅ | Chromium-based |
| Firefox 133+ | ✅ | ✅ | Auth forms + dashboard |

Tested: login, dashboard navigation, AI upload, report download.

---

## 11. Accessibility — Task 339

| Check | Location | Result |
|-------|----------|:------:|
| Labelled email/password inputs | `#admin-email`, `#driver-email` | ✅ |
| Keyboard submit (Enter) | Login forms | ✅ |
| `aria-label` on password toggle | Admin + user login | ✅ |
| Tab navigation on fines tabs | `FinesTabs` `aria-label` | ✅ |
| Focus visible on buttons | Shared UI components | ✅ |

---

## 12. UAT role flows — Task 340

### Flow A — Admin (operations)

1. Login → dashboard stats refresh  
2. Cameras → live status grid  
3. AI Detection → upload image → view results  
4. Export PDF report  

**Script:** `docs/final-year-project/DEMO-SCRIPT.md` Scenes 1–2, 7

### Flow B — Police officer (enforcement)

1. Login (Officer tab) → dashboard  
2. Run detection with auto-violation  
3. Review violation queue → confirm → issue fine  

**Script:** DEMO-SCRIPT Scenes 4–5

### Flow C — Driver (citizen)

1. Login (Driver tab) → notifications  
2. View violation + fine  
3. Navigate Fines tabs (manage / payments)  

**Script:** DEMO-SCRIPT Scene 6

---

## Automated test commands

```bash
# Full backend suite
npm run test:backend

# Phase 12 focused
cd backend && python manage.py test tests.backend tests.api.test_health_auth_users tests.integration tests.security -v 2

# Frontend unit tests
npm run test:frontend-admin
npm run test:frontend-user

# E2E (requires backend + both frontends running)
cd tests/e2e && npm install && npm test

# Structure validation
npm run validate:all
```

---

## Sign-off

| Tester | Role | Date | Status |
|--------|------|------|:------:|
| Developer | Full stack | 2026-07-12 | PASS |
| Supervisor | Review | — | Pending |

*Related: `INTEGRATION-VALIDATION-REPORT.md`, `PERFORMANCE-EVALUATION.md`, `tests/security/README.md`*
