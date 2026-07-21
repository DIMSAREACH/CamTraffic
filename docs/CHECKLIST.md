# CamTraffic — Enterprise Development Checklist (150 Tasks)

**Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

> **Legend:** ✅ = Phase complete · 🔄 = In Progress · ⬜ = Not Started  
> **Checkbox:** `[x]` = done in repo · `[ ]` = not done / missing deliverable  
> **Audited:** 2026-07-14 against actual codebase (`frontend-*/`, `backend/`, `ai/`, `deploy/`)  
> **Software built (web + API + AI integration):** **100%** — see [`SOFTWARE-BUILD-COMPLETION.md`](SOFTWARE-BUILD-COMPLETION.md)  
> **End-to-end production platform (honest v1.0):** **100%** — [`PRODUCTION-PLATFORM-COMPLETION.md`](PRODUCTION-PLATFORM-COMPLETION.md) · `npm run validate:production`  
> **Real data only (no mock/sample UI):** **100%** — [`REAL-DATA-SYSTEM-COMPLETION.md`](REAL-DATA-SYSTEM-COMPLETION.md) · `npm run validate:real-data`  
> **23-phase roadmap:** [`docs/ENTERPRISE-CHECKLIST-23-PHASES.md`](ENTERPRISE-CHECKLIST-23-PHASES.md) — **web app 23/23 complete**  
> **Task specs:** One markdown file per task in [`docs/tasks/`](tasks/README.md) (`Task001.md` … `Task150.md`)

---

## Enterprise Progress Tracker

| Phase | Name | Tasks | Done | Status |
|------:|------|------:|-----:|:------:|
| 1 | Project Foundation | 10 | 9 | 🔄 |
| 2 | Database Design | 10 | 10 | ✅ |
| 3 | Authentication | 10 | 10 | ✅ |
| 4 | Admin CRUD Modules | 25 | 25 | ✅ |
| 5 | AI Module | 15 | 15 | ✅ |
| 6 | AI Detection Center | 10 | 10 | ✅ |
| 7 | Officer Portal | 10 | 10 | ✅ |
| 8 | Driver Portal | 10 | 10 | ✅ |
| 9 | Mobile App | 10 | 0 | ⬜ |
| 10 | Reports & Analytics | 10 | 10 | ✅ |
| 11 | Enterprise UI/UX | 10 | 10 | ✅ |
| 12 | Testing | 10 | 10 | ✅ |
| 13 | Deployment | 10 | 10 | ✅ |
| | **TOTAL** | **150** | **140** | **🔄** |
| | **Software scope (excl. mobile app)** | **140** | **140** | **✅ 100%** |

> **140/150** = full enterprise plan including optional **Flutter mobile** (Phase 9 + Task008).  
> **140/140 software scope** = everything required for a **complete web-based enforcement system** is in the repo.

---

## Phase 1 — Project Foundation (Task001–Task010) 🔄 9/10

> Root monorepo · See `docs/FOLDER-MAP.md`, `package.json`, `docker-compose.yml`

- [x] **Task001** — Enterprise Project Setup → `package.json`, `turbo.json`, `tsconfig.base.json`, `README.md`
- [x] **Task002** — Monorepo Folder Structure → npm workspaces, `packages/`, `scripts/scaffold-folders.mjs`
- [x] **Task003** — Docker & Docker Compose Setup → `docker-compose.yml`, `deploy/docker/docker-compose.prod.yml`
- [x] **Task004** — Backend (Django + DRF) Setup → `backend/`, `manage.py`, `camtraffic/settings.py`
- [x] **Task005** — Frontend Admin (React + Vite) Setup → `frontend-admin/`, Vite + React 19
- [x] **Task006** — Frontend User (React + Vite) Setup → `frontend-user/`, officer + driver portals
- [x] **Task007** — AI Service (Python + YOLOv11) Setup → `ai/`, `backend/ai_detection/`, `ai/requirements.txt`
- [ ] **Task008** — Flutter Mobile Setup → *not started* (no `mobile/` or Flutter project in repo)
- [x] **Task009** — CI/CD & Git Workflow → `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `.gitignore`
- [x] **Task010** — Environment Configuration → `.env.example`, `scripts/validate-env.mjs`, `scripts/setup-env.mjs`

---

## Phase 2 — Database Design (Task011–Task020) ✅ 10/10

> Django apps under `backend/<app>/` · See `docs/DATABASE.md`, `docs/SCHEMA.sql`

- [x] **Task011** — Database Design → 14+ Django apps, PostgreSQL 16 / SQLite, ER in `docs/ARCHITECTURE-DIAGRAMS.md`
- [x] **Task012** — User & Role Tables → `backend/users/models.py`, `backend/rbac/models.py`
- [x] **Task013** — Officer & Driver Tables → `Officer`, `Driver` in `backend/users/models.py`
- [x] **Task014** — Vehicle Tables → `backend/vehicles/models.py`
- [x] **Task015** — Traffic Sign Tables → `backend/traffic_signs/models.py`
- [x] **Task016** — Camera Tables → `backend/infrastructure/models.py` (`Camera`, `Road`, `PoliceStation`)
- [x] **Task017** — AI Model & Dataset Tables → `AIModelVersion` + `datasets.Dataset`, `datasets.DatasetVersion`
- [x] **Task018** — Violation, Evidence & Fine Tables → `violations/`, `fines/`, evidence attachments
- [x] **Task019** — Notification & Audit Tables → `notifications/`, `audit/`, `LoginEvent`
- [x] **Task020** — Seed Data & Migrations → `seed_data.py`, `python manage.py migrate`, `core/backup_service.py`

---

## Phase 3 — Authentication (Task021–Task030) ✅ 10/10

> `backend/authentication/`, `backend/rbac/` · API prefix `/api/`

- [x] **Task021** — JWT Authentication → `djangorestframework-simplejwt`, access + refresh tokens
- [x] **Task022** — Login → `POST /api/auth/login/` with login audit
- [x] **Task023** — Logout → `POST /api/auth/logout/` with token blacklist
- [x] **Task024** — Forgot Password → `POST /api/auth/password-reset/` (Resend + SMTP)
- [x] **Task025** — Reset Password → `POST /api/auth/password-reset/confirm/`
- [x] **Task026** — RBAC → `Role`, `Permission`, `UserRole` in `backend/rbac/`
- [x] **Task027** — Permission Guard → `HasRBACRole()`, `HasRBACPermission()`, frontend route guards
- [x] **Task028** — Session Management → JWT rotation, refresh, logout-other-sessions
- [x] **Task029** — Profile → `GET/PATCH /api/auth/profile/`, avatar upload, `ProfilePage.tsx`
- [x] **Task030** — Security Middleware → rate limiting, security headers, CSRF, `tests/security/`

---

## Phase 4 — Admin CRUD Modules (Task031–Task055) ✅ 25/25

> `frontend-admin/admin/pages/`, `frontend-admin/shared/pages/` · Backend `/api/`

### User & Access
- [x] **Task031** — User Management (CRUD) → `admin/pages/UsersPage.tsx`, `/api/users/`
- [x] **Task032** — Role Management (CRUD) → `admin/pages/RolesPage.tsx`, `/api/rbac/roles/`
- [x] **Task033** — Permission Management (CRUD) → permissions matrix in `RolesPage.tsx`, `/api/rbac/permissions/`

### People & Vehicles
- [x] **Task034** — Officer Management (CRUD) → `admin/pages/OfficersPage.tsx`, `/api/officers/`
- [x] **Task035** — Driver Management (CRUD) → `admin/pages/DriversPage.tsx`, `/api/drivers/`
- [x] **Task036** — Vehicle Management (CRUD) → `shared/pages/VehiclesPage.tsx`, `/api/vehicles/`
- [x] **Task037** — Vehicle Owner Management (CRUD) → `admin/pages/VehicleOwnersPage.tsx`, `/api/vehicles/owners/`

### Signs & Cameras
- [x] **Task038** — Traffic Sign Management (CRUD) → `shared/pages/TrafficSignsPage.tsx`
- [x] **Task039** — Traffic Sign Category (CRUD) → `SignCategoriesManagementPanel.tsx`
- [x] **Task040** — Camera Management (CRUD) → `shared/pages/CamerasPage.tsx`, `/api/cameras/`
- [x] **Task041** — Camera Location (CRUD) → `admin/pages/CameraLocationsPage.tsx`, lat/lng on cameras & roads

### AI & Enforcement
- [x] **Task042** — AI Model Management (CRUD) → `shared/pages/AIModelsPage.tsx`, `/api/ai-models/`
- [x] **Task043** — Dataset Management (CRUD) → `backend/datasets/`, `admin/pages/DatasetsPage.tsx`, `/api/datasets/`
- [x] **Task044** — Violation Management (CRUD) → `shared/pages/ViolationsPage.tsx`, `/api/violations/`
- [x] **Task045** — Evidence Management (CRUD) → `shared/pages/EvidenceArchivePage.tsx`
- [x] **Task046** — Fine Management (CRUD) → fine APIs + `FineManagement.tsx`
- [x] **Task047** — Appeal Management (CRUD) → `shared/pages/AppealsPage.tsx`, `/api/appeals/`

### System & Reports
- [x] **Task048** — Notification Management (CRUD) → `NotificationTemplatesManagementPanel.tsx`
- [x] **Task049** — Report Templates → `ReportTemplatesManagementPanel.tsx` on `ReportsPage.tsx`, `settingsAPI` key `report_templates`
- [x] **Task050** — Dashboard Widgets → `AdminDashboard.tsx`, `AnalyticsWidgets.tsx`
- [x] **Task051** — Audit Logs → `shared/pages/AuditLogsPage.tsx`, `/api/audit/`
- [x] **Task052** — System Settings → `admin/pages/SystemSettingsPage.tsx`, `core/models.SystemSetting`
- [x] **Task053** — Language Management → `LanguageThemeManagementPanel.tsx`, `settingsAPI` key `language_overrides`
- [x] **Task054** — Theme Management → `LanguageThemeManagementPanel.tsx` + `AppearanceSettingsPanel`, `theme_admin_config`
- [x] **Task055** — Profile Management → `shared/pages/ProfilePage.tsx`, avatar crop, security tab

---

## Phase 5 — AI Module (Task056–Task070) ✅ 15/15

> `ai/training/`, `backend/datasets/`, `admin/pages/AIDashboardPage.tsx`, `AITrainingCenterPage.tsx`, `AISettingsPage.tsx`

- [x] **Task056** — AI Dashboard → `admin/pages/AIDashboardPage.tsx`, `/api/dashboard/admin/ai/`
- [x] **Task057** — Dataset Upload → register datasets + sync from `ai/dataset/` via `DatasetsPage.tsx`
- [x] **Task058** — Dataset Versioning → `DatasetVersion` model + `/api/datasets/<id>/versions/`
- [x] **Task059** — Image Annotation Integration → `CvatAnnotationPanel.tsx` on `DatasetsPage.tsx`, `/api/datasets/cvat/`, CVAT iframe + workflow
- [x] **Task060** — AI Training Center → `admin/pages/AITrainingCenterPage.tsx`, `/admin/ai-training`
- [x] **Task061** — Traffic Sign Model Training → `best_v2.pt`, mAP@50 = **0.908** on 10-class signs
- [x] **Task062** — Vehicle Model Training → `camtraffic-combined` run, `weights/best_combined.pt`
- [x] **Task063** — License Plate Model Training → plate classes in combined run (plate_private mAP@50 = **0.954**)
- [x] **Task064** — OCR Model Training → `OcrTrainingPanel.tsx` on `AITrainingCenterPage.tsx`, `/api/ai/ocr-training/`
- [x] **Task065** — AI Model Evaluation → `docs/final-year-project/AI-ACCURACY-EVALUATION.md`, `ai/evaluation/run_phase10.py`
- [x] **Task066** — Model Deployment → ONNX export, `backend/ai_detection/` pipeline, `AI_MOCK_MODE`
- [x] **Task067** — AI Analytics → `AIDashboardPage.tsx` + `/api/dashboard/admin/analytics/detections/`
- [x] **Task068** — Training History → `AiTrainingHistoryPanel`, `AIModelVersion` records
- [x] **Task069** — Model Version Control → `backend/ai_models/models.py` (`AIModelVersion`)
- [x] **Task070** — AI Settings → `admin/pages/AISettingsPage.tsx`, `settingsAPI` key `ai_settings`

---

## Phase 6 — AI Detection Center (Task071–Task080) ✅ 10/10

> `frontend-admin/shared/pages/AIDetectionPage.tsx`, `EnterpriseAIDetectionCenterPage.tsx`

- [x] **Task071** — AI Detection Center UI → `EnterpriseAIDetectionCenterPage.tsx`, `AIDetectionPage.tsx`
- [x] **Task072** — Vehicle Detection → YOLO combined model, `POST /api/ai/detect/`
- [x] **Task073** — Traffic Sign Detection → 10-class production model `best_v2.pt`
- [x] **Task074** — License Plate Detection → plate classes in combined YOLO model
- [x] **Task075** — OCR Recognition → EasyOCR, `POST /api/ocr/recognize/`
- [x] **Task076** — Violation Rule Engine → `pipeline_enforcement.py`, auto-create violations
- [x] **Task077** — Detection History → `AILogsPage.tsx`, `AIDetectionLog` model
- [x] **Task078** — Detection API Integration → `backend/ai_detection/`, frame upload + process endpoints
- [x] **Task079** — Live Camera Detection → `LiveCameraDashboardPanel`, `POST /api/ai/process-frame/`
- [x] **Task080** — Detection Analytics → `AIDashboardPage.tsx` detection stats + `/api/dashboard/admin/analytics/detections/`

---

## Phase 7 — Officer Portal (Task081–Task090) ✅ 10/10

> `frontend-user/user/`, `frontend-user/shared/pages/` · Police role routes

- [x] **Task081** — Officer Dashboard → `user/pages/dashboard/PoliceDashboard.tsx`
- [x] **Task082** — Live Camera Monitoring → `shared/pages/CamerasPage.tsx`
- [x] **Task083** — AI Detection Review → `shared/pages/AIDetectionPage.tsx`, `ViolationsPage.tsx`
- [x] **Task084** — Approve / Reject Violations → violation status management in `ViolationsPage.tsx`
- [x] **Task085** — Evidence Viewer → `shared/pages/EvidenceArchivePage.tsx`
- [x] **Task086** — Fine Issuing → `shared/pages/FineManagement.tsx` (officer flows)
- [x] **Task087** — Reports → `shared/pages/ReportsPage.tsx`, CSV + PDF export
- [x] **Task088** — Notifications → `shared/pages/NotificationsPage.tsx`
- [x] **Task089** — Officer Profile → `shared/pages/ProfilePage.tsx`
- [x] **Task090** — Activity History → audit + login history in profile and `AuditLogsPage.tsx`

---

## Phase 8 — Driver Portal (Task091–Task100) ✅ 10/10

> `frontend-user/user/pages/driver/` · Driver role routes

- [x] **Task091** — Driver Dashboard → `user/pages/dashboard/DriverDashboard.tsx`
- [x] **Task092** — Profile Management → `shared/pages/ProfilePage.tsx`
- [x] **Task093** — My Vehicles → `shared/pages/VehiclesPage.tsx` (driver scope)
- [x] **Task094** — My Violations → `shared/pages/ViolationsPage.tsx` (driver scope)
- [x] **Task095** — Evidence Viewer → `shared/pages/EvidenceArchivePage.tsx`
- [x] **Task096** — Fine Payment → `shared/pages/FineManagement.tsx` (pay flow)
- [x] **Task097** — Appeal Submission → `shared/pages/AppealsPage.tsx`
- [x] **Task098** — Notifications → `shared/pages/NotificationsPage.tsx`
- [x] **Task099** — Settings → `user/pages/driver/DriverSettingsPage.tsx`
- [x] **Task100** — Payment History → `user/pages/driver/DriverPaymentHistoryPage.tsx`

---

## Phase 9 — Mobile App (Task101–Task110) ⬜ 0/10

> **Not started** — no Flutter project in repository

- [ ] **Task101** — Flutter Project
- [ ] **Task102** — Authentication
- [ ] **Task103** — Officer Mobile
- [ ] **Task104** — Driver Mobile
- [ ] **Task105** — AI Detection Viewer
- [ ] **Task106** — Notifications
- [ ] **Task107** — Offline Support
- [ ] **Task108** — Camera Integration
- [ ] **Task109** — Settings
- [ ] **Task110** — Build Release

---

## Phase 10 — Reports & Analytics (Task111–Task120) ✅ 10/10

> `shared/pages/ReportsPage.tsx`, `backend/dashboard/`, `docs/final-year-project/PERFORMANCE-EVALUATION.md`

- [x] **Task111** — Dashboard Charts → violation trends, camera uptime on admin + officer dashboards
- [x] **Task112** — Traffic Statistics → dashboard analytics endpoints, reports page
- [x] **Task113** — AI Accuracy Dashboard → `AI-ACCURACY-EVALUATION.md`, per-class metrics in `ai/runs/evaluation/final/`
- [x] **Task114** — Export PDF → `reportlab` via reports API + `ReportsPage.tsx`
- [x] **Task115** — Export Excel → `openpyxl` export endpoints
- [x] **Task116** — Export CSV → CSV export on reports
- [x] **Task117** — Heat Maps → `ReportsHeatmapPanel` on `ReportsPage.tsx`, `/api/dashboard/admin/analytics/heatmap/`
- [x] **Task118** — Camera Analytics → `CameraHealthMonitoringPanel`, live status API
- [x] **Task119** — Officer Performance → `ReportsOfficerPerformancePanel`, `/api/dashboard/admin/analytics/officers/`
- [x] **Task120** — Driver Statistics → `ReportsDriverAnalyticsPanel`, `/api/dashboard/admin/analytics/drivers/`

---

## Phase 11 — Enterprise UI/UX (Task121–Task130) ✅ 10/10

> `frontend-*/shared/components/ui/`, `shared/context/`, `shared/i18n/`

- [x] **Task121** — Design System → shared UI components, CSS tokens, `packages/ui`
- [x] **Task122** — Professional Login → `AuthPageBackground`, branded login pages both portals
- [x] **Task123** — Dashboard Redesign → enterprise dashboard layouts admin + user portals
- [x] **Task124** — Reusable Components → `shared/components/ui/*`, form primitives
- [x] **Task125** — Dark Mode → `ThemeContext`, `AppearanceSettingsPanel`
- [x] **Task126** — Light Mode → theme toggle, light default
- [x] **Task127** — Khmer Localization → `translations.ts` (km), Khmer fonts
- [x] **Task128** — English Localization → `translations.ts` (en), `LocaleToggle`
- [x] **Task129** — Responsive Design → mobile sidebar drawer, breakpoints
- [x] **Task130** — Accessibility → `SkipToMainLink`, `AuthLanguageSwitcher`, i18n ARIA, `a11y.css`, axe Playwright tests (`docs/ACCESSIBILITY-AUDIT.md`)

---

## Phase 12 — Testing (Task131–Task140) ✅ 10/10

> `tests/`, `backend/tests/` · Ref: `docs/final-year-project/UAT-REPORT.md`

- [x] **Task131** — Backend Unit Tests → `backend/tests/backend/` (6+ tests)
- [x] **Task132** — Frontend Unit Tests → `tests/frontend-admin/`, `tests/frontend-user/` (22 assertions)
- [x] **Task133** — API Testing → `backend/tests/api/test_health_auth_users.py`
- [x] **Task134** — AI Testing → `test_e2e_pipeline.py`, `test_plate_ocr.py`, `edge_case_test.py`
- [x] **Task135** — Integration Testing → `backend/tests/integration/`, `validate_integration.py`
- [x] **Task136** — End-to-End Testing → `tests/e2e/` Playwright (4 smoke tests)
- [x] **Task137** — Security Testing → `tests/security/`, RBAC + rate limit + headers
- [x] **Task138** — Performance Testing → `health-benchmark.mjs`, `PERFORMANCE-EVALUATION.md`
- [x] **Task139** — User Acceptance Testing → `UAT-REPORT.md` (3 role flows)
- [x] **Task140** — Bug Fixing → `FINAL-BUG-FIXES-LOG.md`

---

## Phase 13 — Deployment (Task141–Task150) ✅ 10/10

> `deploy/` · Ref: `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md`

- [x] **Task141** — Docker Production → `deploy/docker/Dockerfile.*.prod`, 8-service compose
- [x] **Task142** — Nginx Configuration → `deploy/nginx/nginx.conf`, `camtraffic.conf`
- [x] **Task143** — HTTPS & SSL → `deploy/ssl/`, Certbot scripts, TLS 1.2/1.3
- [x] **Task144** — CI/CD Pipeline → `.github/workflows/ci.yml`
- [x] **Task145** — Monitoring & Logging → `/health/`, JSON logging, `config/monitoring.py`
- [x] **Task146** — Backup & Recovery → `backup_postgres.sh`, `BackupRestorePage.tsx`
- [x] **Task147** — Production Build → Gunicorn, production settings, npm build scripts
- [x] **Task148** — Deployment Validation → `INTEGRATION-VALIDATION-REPORT.md`, `LIVE-DEMO-SETUP-VALIDATION.md`
- [x] **Task149** — Documentation → `docs/`, manuals, API.md, thesis package
- [x] **Task150** — Final System Demo → `DEMO-SCRIPT.md`, `FINAL-DEMO-VIDEO-PACKAGE.md`, `DEMO-ACCOUNTS.md`

---

## Final Deliverable

After completing **Task001–Task150**, the system includes:

| Deliverable | Status |
|-------------|--------|
| Landing Website | ⬜ Not built (admin portal serves as entry; nginx redirect only) |
| Admin Portal | ✅ `frontend-admin/` |
| Officer Portal | ✅ `frontend-user/` (police role) |
| Driver Portal | ✅ `frontend-user/` (driver role) |
| Flutter Mobile App | ⬜ Phase 9 not started |
| Django REST API | ✅ `backend/` (~120 routes) |
| PostgreSQL Database | ✅ Docker + migrations |
| YOLOv11 Traffic Sign Detection | ✅ `best_v2.pt` (10-class, mAP@50 0.908) |
| YOLOv11 Vehicle Detection | ✅ combined model |
| YOLOv11 License Plate Detection | ✅ combined model |
| EasyOCR License Plate Recognition | ✅ baseline + fine-tune guide |
| AI Training Center | ✅ `AITrainingCenterPage.tsx` + scripts |
| AI Detection Center | ✅ Enterprise detection pages |
| Complete CRUD Modules | ✅ 25/25 admin modules |
| Reports & Analytics | ✅ heat map + officer/driver analytics |
| Authentication & RBAC | ✅ JWT + RBAC |
| Docker Deployment | ✅ prod compose + scripts |
| Testing & QA | ✅ automated + UAT |
| Production-Ready Build | ✅ deploy package |
| Thesis Demonstration System | ✅ demo scripts + accounts |

---

## Cursor AI Workflow (Recommended)

1. **One task file per task** — `docs/tasks/Task001.md` … `Task150.md` (see [`docs/tasks/README.md`](tasks/README.md))
2. **System workflow reference** — [`docs/SYSTEM-WORKFLOW.md`](SYSTEM-WORKFLOW.md) (admin, officer, driver, AI training vs detection)
3. Each task file includes: Objective, Business Requirements, Functional Requirements, Technical Requirements, Database Changes, Backend Work, Frontend Work, UI/UX Requirements, API Requirements, Acceptance Criteria, Testing Checklist, Cursor AI Prompt
4. **Complete one task at a time** before moving to the next
5. Update this checklist `[ ]` → `[x]` and phase counts when a task is done

---

## Priority Order (Remaining Work)

```text
HIGH  — Task008 Flutter · Task101–110 Mobile App (full phase)
MED   — Task043 Dataset CRUD · Task056–060 AI Training Center UI · Task057–058 Dataset upload/versioning
MED   — Task037 Vehicle Owner CRUD · Task041 Camera Location CRUD · Task049 Report Templates
LOW   — Task053–054 Language/Theme admin CRUD · Task117 Heat Maps · Task119–120 Performance analytics
LOW   — Task130 Full accessibility audit · Landing website
```

---

## Actual Repo Layout

| Checklist reference | Actual path |
|---------------------|-------------|
| Admin portal pages | `frontend-admin/admin/pages/`, `frontend-admin/shared/pages/` |
| User portal pages | `frontend-user/user/pages/`, `frontend-user/shared/pages/` |
| `backend/apps/*` | `backend/<app>/` (e.g. `authentication`, `users`) |
| `/api/v1/*` | `/api/*` (+ `/api/v1/` alias) |
| `ai-service/` | `backend/ai_detection/` + `ai/` |
| Flutter mobile | *not present* |
| `deploy/` | `docker-compose.yml`, `deploy/docker/`, `deploy/nginx/` |

---

## Architecture Reference

```
                          ┌───────────────────────────────────┐
                          │          Nginx (production)        │
                          │   admin · user · api               │
                          └─────┬────────────┬────────────┬────┘
                                │            │            │
                    ┌───────────▼──┐  ┌──────▼───┐  ┌────▼──────┐
                    │ Admin Portal │  │User Portal│  │ REST API  │
                    │ React + Vite │  │React+Vite │  │ Django    │
                    │ :5174 (dev)  │  │ :5173    │  │ :8000     │
                    └──────────────┘  └───────────┘  └─────┬─────┘
                                                           │
                    ┌──────────────────────────────────────┤
                    │  AI pipeline in Django (ai_detection) │
              ┌─────▼────┐  ┌─────────┐  ┌───────────────▼─────┐
              │PostgreSQL│  │  Redis  │  │  YOLO + OCR         │
              │ or SQLite│  │ (opt.)  │  │  ai/weights/        │
              └──────────┘  └────┬────┘  └─────────────────────┘
                                 │
                          ┌──────▼─────┐
                          │  Celery    │ (configured; optional)
                          └────────────┘
```

---

*Updated: 2026-07-13 — **140 / 150 tasks done** (Phase 11 complete; remaining: Flutter mobile Phase 9 + Task008).*  
*Legacy 440-task checklist (Phases 0–17) archived in git history.*
