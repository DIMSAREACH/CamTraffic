# CamTraffic — Software Requirements Specification (SRS)

**Version:** 1.0 · **Date:** July 2026

---

## 1. Introduction

### 1.1 Purpose

This SRS defines functional and non-functional requirements for CamTraffic, aligned with the implemented Django + React codebase.

### 1.2 Scope

Web-based traffic sign detection and law enforcement for Cambodia, serving administrators, traffic police, and drivers through two React portals and one REST API.

---

## 2. Functional Requirements

### 2.1 Authentication & Accounts (FR-AUTH)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-AUTH-01 | Users register with email, password, role | `POST /api/auth/register/` |
| FR-AUTH-02 | Login returns JWT access + refresh tokens | `POST /api/auth/login/` |
| FR-AUTH-03 | Token refresh and logout with blacklist | `POST /api/auth/refresh/`, `POST /api/auth/logout/` |
| FR-AUTH-04 | Forgot / reset password via email | `POST /api/auth/forgot-password/`, reset page |
| FR-AUTH-05 | OAuth login (Google, GitHub) | `GET /api/auth/oauth/<provider>/` |
| FR-AUTH-06 | Profile read/update and avatar upload | `GET/PATCH /api/auth/profile/` |
| FR-AUTH-07 | Role-based portal routing | Admin vs user portal redirect by `user.role` |
| FR-AUTH-08 | RBAC roles and permissions API | `GET/POST /api/rbac/roles/`, `/api/rbac/permissions/` |

### 2.2 AI Detection (FR-AI)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-AI-01 | Upload image for sign + vehicle + plate detection | `POST /api/ai/detect/` |
| FR-AI-02 | Webcam / live frame processing | `AIDetectionPage`, pipeline components |
| FR-AI-03 | Store detection logs with confidence | `ai_detection` models, `AILogsPage` |
| FR-AI-04 | Map YOLO class to catalog sign code | Sign catalog + hybrid detection services |
| FR-AI-05 | OCR license plate text | OCR module in detection pipeline |
| FR-AI-06 | Mock mode without GPU | `AI_MOCK_MODE` environment flag |
| FR-AI-07 | AI model version registry | `GET/POST /api/ai-models/` |

### 2.3 Enforcement (FR-ENF)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-ENF-01 | Create and list traffic violations | `/api/violations/` |
| FR-ENF-02 | Issue and track fines (pending/paid/overdue) | `/api/fines/`, `FineManagement` |
| FR-ENF-03 | Driver pay fine action | Fine pay endpoint + UI |
| FR-ENF-04 | Submit and review appeals | `/api/appeals/` |
| FR-ENF-05 | Evidence linked to violations/fines | Media uploads, `EvidenceArchivePage` |
| FR-ENF-06 | Unknown vehicle registry | `/api/unknown-vehicles/` |

### 2.4 Reference Data (FR-DATA)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-DATA-01 | Traffic sign catalog CRUD | `/api/signs/` |
| FR-DATA-02 | Vehicle registration by driver | `/api/vehicles/` |
| FR-DATA-03 | Camera and road management | `/api/cameras/`, `/api/roads/` |
| FR-DATA-04 | User management (admin) | `/api/users/` |

### 2.5 Dashboard & Reporting (FR-RPT)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-RPT-01 | Role-specific dashboard stats | `/api/dashboard/admin/`, `/police/`, `/driver/` |
| FR-RPT-02 | PDF report export | `/api/dashboard/.../report/pdf/` |
| FR-RPT-03 | Monthly Excel enforcement export | `/api/dashboard/enforcement/export.xlsx/` |
| FR-RPT-04 | Evidence search | `/api/dashboard/evidence/` |
| FR-RPT-05 | System backup download | `/api/dashboard/admin/backup/` |

### 2.6 Notifications & Audit (FR-OPS)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| FR-OPS-01 | In-app notifications per role | `/api/notifications/` |
| FR-OPS-02 | Audit log of admin actions | `/api/audit/` |
| FR-OPS-03 | Login history tracking | Audit models + admin views |

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-PERF)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | API health check response | < 500 ms on local dev |
| NFR-PERF-02 | AI detection (CPU) | Documented in `ai/runs/` benchmarks |
| NFR-PERF-03 | Dashboard list pagination | 20 items/page default |
| NFR-PERF-04 | DB query optimization | `select_related` / `prefetch_related` on list views |

### 3.2 Security (NFR-SEC)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-SEC-01 | JWT authentication on protected routes | DRF + SimpleJWT |
| NFR-SEC-02 | Password validators (length, complexity) | Django validators |
| NFR-SEC-03 | HTTPS-ready cookie flags | `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` in production |
| NFR-SEC-04 | CORS restricted to frontend origins | `corsheaders` in settings |
| NFR-SEC-05 | File upload MIME validation | Pillow + content checks on uploads |
| NFR-SEC-06 | SQL injection prevention | Django ORM only |
| NFR-SEC-07 | Role permission classes | `IsAdmin`, `IsPoliceOrAdmin`, etc. |

### 3.3 Usability (NFR-UX)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-UX-01 | Khmer + English UI | `LanguageContext`, locale files |
| NFR-UX-02 | Dark / light theme | Theme toggle, CSS variables |
| NFR-UX-03 | Responsive layout | Sidebar collapse, mobile drawer |
| NFR-UX-04 | Accessible form labels | Radix UI components, aria attributes |

### 3.4 Reliability & Operations (NFR-OPS)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-OPS-01 | Health endpoints | `/health/`, `/health/ready/`, `/api/health/` |
| NFR-OPS-02 | Structured logging | `LOGGING` in `camtraffic/settings.py` |
| NFR-OPS-03 | Database backups | `core/backup_service.py`, admin backup API |
| NFR-OPS-04 | Docker-based local stack | `docker-compose.yml` |
| NFR-OPS-05 | Celery task queue (optional) | Redis + `camtraffic/celery.py` |

### 3.5 Maintainability (NFR-MAINT)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-MAINT-01 | Modular Django apps | 14+ domain apps under `backend/` |
| NFR-MAINT-02 | Shared frontend components | `frontend-*/shared/` |
| NFR-MAINT-03 | Automated backend tests | `backend/tests/` (150+ tests) |
| NFR-MAINT-04 | Environment-based config | `.env.example` per service |

---

## 4. User Stories

### Administrator

- As an **admin**, I want to manage users and roles so that only authorized staff access enforcement tools.
- As an **admin**, I want to configure traffic signs and cameras so that AI detection matches local regulations.
- As an **admin**, I want audit logs and backups so that the system is accountable and recoverable.
- As an **admin**, I want monthly PDF/Excel reports so that I can present enforcement statistics.

### Traffic Police (Officer)

- As an **officer**, I want to run AI detection on uploads or webcam so that I can identify sign violations quickly.
- As an **officer**, I want to review violations and issue fines so that enforcement is documented with evidence.
- As an **officer**, I want to review driver appeals so that disputes are handled fairly.
- As an **officer**, I want to view camera feeds so that I can monitor assigned locations.

### Driver

- As a **driver**, I want to see my fines and violations so that I know what I owe.
- As a **driver**, I want to register my vehicles so that plates are linked to my account.
- As a **driver**, I want to submit an appeal so that I can contest a fine with a reason.
- As a **driver**, I want notifications when a new fine is issued so that I can respond promptly.

---

## 5. External Interface Requirements

| Interface | Protocol | Notes |
|-----------|----------|-------|
| Admin portal | HTTPS, REST | Vite dev `:5174`, talks to `VITE_API_URL` |
| User portal | HTTPS, REST | Vite dev `:5173` |
| REST API | JSON over HTTP | Django REST Framework |
| PostgreSQL | SQL | Primary production DB |
| Redis | TCP | Cache, Celery broker |
| Email | SMTP / Resend | Password reset |
| OAuth | OAuth 2.0 | Google, GitHub |

---

## 6. Traceability

Requirements map to checklist Phase 0 (P006–P008), Phase 3–6 implementation tasks, and `docs/CHECKLIST.md` for detailed task status.
