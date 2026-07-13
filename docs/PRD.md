# CamTraffic — Product Requirements Document (PRD)

**Project:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Version:** 1.0 · **Date:** July 2026  
**Status:** Approved for implementation (aligned with current codebase)

---

## 1. Project Vision

CamTraffic is an integrated digital enforcement platform that uses computer vision (YOLO-based traffic sign detection and license plate OCR) to support Cambodian traffic police and administrators. The system connects AI inference, violation records, fines, appeals, and multi-role web portals so that detection events can move from camera or upload → review → fine → driver notification in one workflow.

**Vision statement:** Make traffic sign compliance measurable, auditable, and accessible to officers and citizens through AI-assisted detection and transparent enforcement records.

---

## 2. Problem Statement

Cambodia’s urban and highway networks rely heavily on traffic signs, but manual enforcement is inconsistent:

- Officers cannot monitor all intersections continuously.
- Sign violations (no-entry, speed limits, no-turn rules) are under-reported.
- Paper-based or ad-hoc fine processes lack evidence linkage and audit trails.
- Drivers have limited visibility into violations, fines, and appeal options.

CamTraffic addresses this gap by automating sign detection, storing evidence, and providing role-specific portals for administrators, traffic police, and drivers.

---

## 3. Project Objectives

| # | Objective | Success indicator |
|---|-----------|-------------------|
| O1 | Detect Cambodian traffic signs from images/video frames | YOLO model trained on local dataset (`ai/dataset_10/`, 10 sign classes in production catalog) |
| O2 | Read license plates when visible | OCR pipeline integrated in `backend/ai_detection/` |
| O3 | Record violations and issue fines with evidence | `violations`, `fines`, `appeals` Django apps + REST API |
| O4 | Provide admin oversight | Admin portal: users, cameras, signs, reports, audit logs |
| O5 | Support officer field workflows | User portal (police): AI detection, violations, appeals review, cameras |
| O6 | Empower drivers | User portal (driver): my fines, violations, vehicles, appeals |
| O7 | Bilingual operation | Khmer + English UI via `shared/context/LanguageContext` |
| O8 | Deployable stack | Docker Compose: PostgreSQL, Redis, Django, Celery |

---

## 4. Project Scope

### In scope

| Area | Description |
|------|-------------|
| **Portals** | Admin (`frontend-admin`, `/admin/*`) and User (`frontend-user`, `/dashboard/*`) — police + driver |
| **Backend API** | Django REST Framework under `/api/*` |
| **AI** | Sign detection + plate OCR embedded in Django (`ai_detection` app, weights in `ai/weights/`) |
| **Sign classes** | 10-class production catalog (`ai/dataset_10/classes.txt`); extensible sign registry in DB |
| **Enforcement** | Violations, fines, appeals, notifications, evidence archive |
| **Infrastructure** | Cameras, roads, live frame preview, detection logs |
| **Auth** | JWT, OAuth (Google/GitHub), password reset, RBAC models + API |
| **Reports** | PDF/Excel export, dashboard analytics, system backup ZIP |

### Out of scope (current release)

- Separate FastAPI `ai-service` microservice (AI runs in Django monolith)
- Mobile native apps (responsive web only)
- Real-time payment gateway integration (fine status tracked; payment marked manually)
- Supervisor role portal (roles: `admin`, `police`, `driver` only)
- Phase 18 `packages/ui` enterprise redesign (project uses `frontend-*/shared/` UI)

---

## 5. Stakeholder Analysis

| Stakeholder | Role in system | Primary needs |
|-------------|----------------|---------------|
| **System Administrator** | `admin` | User management, cameras, signs, AI models, audit, backups, reports |
| **Traffic Police / Officer** | `police` | Live detection, violation review, fines, appeals, evidence, cameras |
| **Driver / Citizen** | `driver` | View violations & fines, manage vehicles, submit appeals |
| **Project Supervisor / Examiner** | External | Thesis evidence, UAT, documentation, demo reproducibility |
| **ML Engineer / Developer** | Internal | Dataset, training scripts (`scripts/`, `ai/runs/`), model deployment |

---

## 6. Personas (summary)

- **Admin Sophea** — configures cameras and signs, reviews system-wide KPIs, exports monthly reports.
- **Officer Vanna** — runs AI detection on uploads/webcam, confirms violations, processes appeals.
- **Driver Kosal** — checks pending fines, pays or appeals, maintains registered plate numbers.

---

## 7. Assumptions & Constraints

- Development uses SQLite or PostgreSQL; production targets PostgreSQL 16.
- AI inference may run on CPU in development; GPU optional for training.
- `.env` files configure API URLs, JWT, email (Resend/SMTP), and mock mode.
- Large media (weights, datasets) excluded from Git; documented in `.gitignore`.

---

## 8. Related Documents

| Document | Path |
|----------|------|
| Software Requirements | `docs/SRS.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Diagrams | `docs/ARCHITECTURE-DIAGRAMS.md` |
| Database schema | `docs/SCHEMA.sql` |
| Master checklist | `docs/CHECKLIST.md` |
