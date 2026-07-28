# Full System Task Checklist (Web Application)

**Topic:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

**Product:** CamTraffic — Admin, Officer, and Driver web portals + Django REST API + YOLO/OCR pipeline

**Scope:** Complete **web application** lifecycle (research → design → build → AI → enforcement → test → deploy → thesis defense).  
**Out of web scope (optional):** Flutter mobile app (Phase 9 / Task008, Task101–110).

**Legend**

| Mark | Meaning |
|------|---------|
| `[x]` | Done in CamTraffic (audited) |
| `[ ]` | Not done / optional / remaining |
| `[~]` | Partial / depends on environment (RTSP, email, payment keys) |

**Related:** [`CHECKLIST.md`](CHECKLIST.md) (Task001–150) · [`ENTERPRISE-CHECKLIST-23-PHASES.md`](ENTERPRISE-CHECKLIST-23-PHASES.md) · [`docs/tasks/`](tasks/README.md)

---

## Progress overview

| Part | Focus | Web status |
|-----:|-------|:----------:|
| A | Research & thesis foundation | ✅ |
| B | Requirements & Cambodia context | ✅ |
| C | Architecture & system design | ✅ |
| D | Database & data model | ✅ |
| E | Backend API platform | ✅ |
| F | Authentication & RBAC | ✅ |
| G | Admin portal | ✅ |
| H | Officer portal | ✅ |
| I | Driver portal | ✅ |
| J | AI datasets, training & models | ✅ |
| K | AI detection & enforcement pipeline | ✅ |
| L | Payments, notifications & reports | ✅ |
| M | Testing, security & UAT | ✅ |
| N | Deployment & operations | ✅ |
| O | Documentation & defense | ✅ |
| P | Optional mobile (non-web) | ⬜ |

**Web application system:** complete for thesis demonstration when mock/demo flags stay off.

---

# PART A — Research & Thesis Foundation

## A1. Problem definition
- [x] Define problem: traffic-sign violations + enforcement inefficiency in Cambodia
- [x] Define stakeholders: traffic police (officers), drivers/citizens, system administrators
- [x] Define web-first delivery (Admin / Officer / Driver portals)
- [x] Write project objectives and research questions (Chapter 1)
- [x] Define success criteria (detection accuracy, enforcement workflow, portal completeness)

## A2. Literature & related work
- [x] Review YOLO / object detection for traffic signs
- [x] Review ANPR / OCR for license plates
- [x] Review intelligent transportation / e-enforcement systems
- [x] Compare with regional / academic systems
- [x] Document gaps addressed by CamTraffic (Chapter 2)

## A3. Methodology
- [x] Choose SDLC approach (phased enterprise build + iterative AI training)
- [x] Define evaluation metrics (mAP, precision/recall, OCR assistive accuracy, UAT)
- [x] Plan dataset strategy (Cambodia signs, vehicles, plates + public transfer sets)
- [x] Plan system evaluation (unit, API, E2E, security, performance)

---

# PART B — Requirements & Cambodia Context

## B1. Functional requirements
- [x] Detect traffic signs from image / video / camera frame
- [x] Detect vehicles and license plates
- [x] Read plate text via OCR (officer-confirmable)
- [x] Map detections to Cambodia traffic rules / violation types
- [x] Create, review, approve/reject violations
- [x] Issue fines and manage payments / installments
- [x] Support driver appeals
- [x] Provide dashboards, reports, and audit trails

## B2. Non-functional requirements
- [x] Role-based access control (Admin / Officer / Driver)
- [x] Secure JWT authentication
- [x] Bilingual UI (English + Khmer)
- [x] Responsive web UI
- [x] Audit logging for enforcement actions
- [x] Production Docker deployment path

## B3. Cambodia domain mapping
- [x] Traffic sign catalog (categories + Cambodia-relevant classes)
- [x] Violation types linked to signs / observed actions
- [x] Fine amounts / currency handling (KHR / Riel)
- [x] Officer and police-station operational concepts
- [x] Driver vehicle ownership model

---

# PART C — Architecture & System Design

## C1. High-level architecture
- [x] Monorepo layout (`src/backend`, `src/web/*`, `ai/`, `infrastructure/`)
- [x] Admin SPA (React + Vite)
- [x] User SPA — Officer + Driver roles (React + Vite)
- [x] Django REST API backend
- [x] AI detection pipeline integrated with backend
- [x] PostgreSQL database (+ SQLite for local/dev)
- [x] Optional Redis / Celery for async jobs
- [x] Nginx reverse proxy for production

## C2. Design artifacts
- [x] Use-case diagrams (Admin / Officer / Driver / AI)
- [x] Sequence flows: detect → review → fine → pay / appeal
- [x] ER / schema design documentation
- [x] API surface documentation
- [x] Deployment architecture diagrams

## C3. Technology stack freeze
- [x] Frontend: React 19, TypeScript, Vite, Tailwind
- [x] Backend: Django + DRF + SimpleJWT
- [x] AI: Ultralytics YOLO + EasyOCR
- [x] DB: PostgreSQL 16
- [x] Infra: Docker Compose, Nginx, GitHub Actions CI

---

# PART D — Database & Data Model

## D1. Core entities
- [x] Users, roles, permissions (RBAC)
- [x] Officers and drivers
- [x] Vehicles and owners
- [x] Traffic signs and categories
- [x] Cameras, roads, police stations
- [x] AI model versions and datasets
- [x] Violations, evidence, detection logs
- [x] Fines, payments, installments
- [x] Appeals
- [x] Notifications and audit logs
- [x] System settings

## D2. Data operations
- [x] Migrations
- [x] Seed / production seed commands
- [x] Backup / restore support
- [x] Bulk import (CSV/Excel) for admin data

---

# PART E — Backend API Platform

## E1. Platform setup
- [x] Django project + settings / env configuration
- [x] DRF + OpenAPI / Spectacular
- [x] Health endpoints (`/health/`, ready, status)
- [x] Media serving for evidence / crops
- [x] CORS, throttling, security headers

## E2. Domain APIs
- [x] Auth & profile APIs
- [x] Users / officers / drivers CRUD APIs
- [x] Vehicles APIs
- [x] Traffic signs APIs
- [x] Cameras APIs
- [x] Violations / evidence APIs
- [x] Fines / payments / installments APIs
- [x] Appeals APIs
- [x] Notifications APIs
- [x] Dashboard / analytics APIs
- [x] Reports export APIs (PDF / Excel / CSV)
- [x] Admin AI / dataset / model APIs
- [x] Detection pipeline APIs (`/api/ai/…`, OCR)

## E3. Domain routing
- [x] Admin domain routes
- [x] Officer domain routes
- [x] Citizen / driver domain routes
- [x] Strict RBAC 403 across portals

---

# PART F — Authentication & Security

- [x] JWT login / logout / refresh
- [x] Password reset flow
- [x] RBAC roles and permission guards
- [x] Frontend route guards per role
- [x] Session / token blacklist
- [x] Rate limiting on auth
- [x] Security test suite
- [x] No secrets committed (`.env` examples only)

---

# PART G — Admin Portal (Web)

## G1. Access & dashboard
- [x] Admin login
- [x] Admin dashboard KPIs / widgets
- [x] Profile / appearance / language

## G2. People & assets CRUD
- [x] Users, roles, permissions
- [x] Officers management
- [x] Drivers management
- [x] Vehicles & owners
- [x] Traffic signs & categories
- [x] Cameras & locations
- [x] Police stations / roads (infrastructure)

## G3. Enforcement oversight
- [x] Violations management
- [x] Evidence archive
- [x] Fine management
- [x] Appeals review
- [x] Audit logs

## G4. AI operations (admin)
- [x] AI dashboard
- [x] Datasets management / CVAT workflow hooks
- [x] AI Training Center (register weights / history)
- [x] AI model versions
- [x] AI Detection Center
- [x] AI settings / published metrics

## G5. System
- [x] Notifications templates / schedules
- [x] Report center / templates
- [x] System settings
- [x] Backup / restore UI
- [x] Data import

---

# PART H — Officer Portal (Web)

- [x] Officer dashboard
- [x] Live / camera monitoring views
- [x] Upload image or video for AI detection
- [x] Live camera / webcam / frame detect flows
- [x] Review AI detection results (sign, vehicle, plate, OCR)
- [x] Create / confirm violation with observed action
- [x] Approve / reject candidate violations
- [x] Evidence viewer (scene, plate crop, vehicle crop)
- [x] Issue fine (police-only)
- [x] Reports export
- [x] Notifications
- [x] Officer profile / activity history
- [x] RBAC: blocked from admin-only and driver-only actions

---

# PART I — Driver Portal (Web)

- [x] Driver registration / login
- [x] Driver dashboard
- [x] Profile management
- [x] My vehicles
- [x] My violations (+ map / heatmap where enabled)
- [x] Evidence viewer (real AI evidence only)
- [x] Fine list / payment (KHQR + manual proof)
- [x] Installment quote / create / pay
- [x] Payment history / receipts
- [x] Appeal submission & status
- [x] Notifications + preferences
- [x] Signs catalog / traffic rules help pages
- [x] RBAC: blocked from officer/admin APIs and operational AI console

---

# PART J — AI Datasets, Training & Models

## J1. Datasets
- [x] Cambodia traffic signs dataset pipeline
- [x] Cambodia vehicles dataset pipeline
- [x] Cambodia license plates dataset pipeline
- [x] Train / val / test splits + README provenance
- [x] Sample / evaluation media for demos (non-mock production path)

## J2. Training
- [x] Traffic sign YOLO training (production 10-class, mAP@50 ≈ 0.908)
- [x] Vehicle / combined detection training
- [x] License plate detection training
- [x] OCR assistive pipeline (EasyOCR + plate crop)
- [x] Evaluation scripts / confusion matrices / published metrics JSON
- [x] Weight registration in admin Training Center

## J3. Model ops
- [x] Model version records
- [x] ONNX / inference path in backend
- [x] Mock flags OFF for production (`AI_USE_MOCK=False`)
- [x] Honest limits documented (OCR assistive, RTSP hardware, unpublished 248-class until val restored)

---

# PART K — AI Detection & Enforcement Pipeline

## K1. Detection pipeline
- [x] Image upload detection
- [x] Video frame sampling detection
- [x] Live camera / webcam / process-frame
- [x] Vehicle detection stage
- [x] Traffic sign detection stage
- [x] Plate detection stage
- [x] OCR recognition stage
- [x] Annotated result compose (boxes, crops, confidence)
- [x] Detection logging / history

## K2. Law enforcement rule engine
- [x] Map sign class + observed action → violation type
- [x] Resolve plate → registered vehicle / driver (fuzzy where needed)
- [x] Auto-create or draft violation with evidence
- [x] Officer confirmation gate before fine issue
- [x] Demo-violation / sample fallback gated by env flags

## K3. Evidence integrity
- [x] Store scene image / annotated image
- [x] Store plate crop / vehicle crop
- [x] Link AI detection log to violation
- [x] Repair missing media tooling (ops)

---

# PART L — Payments, Notifications & Reports

## L1. Payments
- [x] Fine lifecycle (issued → paid / overdue)
- [x] KHQR payment mode
- [x] Manual payment proof upload
- [x] Installments
- [x] Receipt PDF
- [~] ABA / Stripe live keys (sandbox / optional production credentials)

## L2. Notifications
- [x] In-app notifications
- [x] Templates / multi-channel scaffolding
- [~] Email / SMS / push when Resend / Twilio / FCM configured

## L3. Reports & analytics
- [x] Admin / officer report charts from live DB
- [x] PDF / Excel / CSV export
- [x] Heatmaps
- [x] Camera / officer / driver analytics
- [x] AI accuracy dashboard / published metrics

---

# PART M — Testing, Security & UAT

- [x] Backend unit tests
- [x] Frontend unit tests
- [x] API tests
- [x] AI pipeline tests
- [x] Integration tests
- [x] Playwright E2E smoke
- [x] Security tests (RBAC, headers, rate limit)
- [x] Performance / health benchmarks
- [x] Portal API audits (Admin / Officer / Driver) — production-ready scripts
- [x] Real-data validation (`AI_USE_MOCK=False`)
- [x] UAT role flows documented
- [x] Bug-fix log / production hardening pass

---

# PART N — Deployment & Operations

- [x] Docker Compose (dev + prod)
- [x] Nginx dual-SPA + API config
- [x] HTTPS / SSL scripts
- [x] CI pipeline (GitHub Actions)
- [x] Monitoring / logging / health checks
- [x] Backup & recovery scripts + UI
- [x] Production build scripts
- [x] Deployment validation reports
- [x] Environment examples (no secrets in git)
- [~] Live RTSP camera URLs (hardware / site-dependent)
- [~] Auto CD from GitHub to VPS (manual deploy script path exists)

---

# PART O — Documentation & Thesis Defense

## O1. Engineering docs
- [x] README / installation guide
- [x] Architecture / database / API docs
- [x] System workflow docs
- [x] Admin / officer / driver manuals
- [x] Demo script & demo accounts
- [x] Production-ready portal reports

## O2. Thesis package
- [x] Chapter 1 — Introduction
- [x] Chapter 2 — Literature review
- [x] Chapter 3 — Methodology
- [x] Chapter 4 — System design
- [x] Chapter 5 — Implementation
- [x] Chapter 6 — Testing & evaluation
- [x] Chapter 7 — Conclusion
- [x] References / appendices
- [x] Defense slides / talking points / day checklist
- [x] Performance & AI accuracy evaluation reports

## O3. Defense demo checklist (run day)
- [x] Backend `runserver` or Docker stack healthy
- [x] Admin + User portals load
- [x] Login as Admin / Officer / Driver
- [x] Run live detect on sample Cambodia media
- [x] Show sign + plate + OCR evidence
- [x] Officer creates / confirms violation and issues fine
- [x] Driver views fine / pays or appeals
- [x] Show reports / audit / AI metrics
- [x] State honest limits (OCR assistive, RTSP, payment gateways)

---

# PART P — Optional / Out of Web Scope

- [ ] Flutter project setup (Task008)
- [ ] Officer mobile app (Task101–110)
- [ ] Driver mobile app
- [ ] Offline mobile sync
- [ ] Public marketing landing website (separate from portals)
- [ ] Always-on remote GPU training job server

---

# End-to-end acceptance (Web system)

The web system is **accepted as complete** when all of the following are true:

1. **Admin** can manage users, signs, cameras, AI models/datasets, violations, fines, appeals, reports, and settings on live API + DB.
2. **Officer** can detect (image/video/camera), review AI evidence, confirm violations, and issue fines.
3. **Driver** can view violations/evidence, pay fines (KHQR/manual), submit appeals, and receive in-app notifications.
4. **AI pipeline** runs with `AI_USE_MOCK=False` and stores real detection logs + media.
5. **RBAC** blocks cross-portal access (403).
6. **Exports / dashboards** use live data (empty when DB empty — no fake rows).
7. **Thesis demo path** is reproducible from docs + demo accounts + sample media.

---

# Locked production flags

```bash
# Frontends
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false

# Backend
AI_USE_MOCK=False
AI_PIPELINE_DEMO_VIOLATION=False
```

---

# Granular engineering map (Task001–Task150)

| Phase | Tasks | Web |
|------:|------:|:---:|
| 1 Foundation | 001–010 | 9/10 (Flutter Task008 optional) |
| 2 Database | 011–020 | 10/10 |
| 3 Auth | 021–030 | 10/10 |
| 4 Admin CRUD | 031–055 | 25/25 |
| 5 AI Module | 056–070 | 15/15 |
| 6 Detection Center | 071–080 | 10/10 |
| 7 Officer Portal | 081–090 | 10/10 |
| 8 Driver Portal | 091–100 | 10/10 |
| 9 Mobile | 101–110 | 0/10 (out of web scope) |
| 10 Reports | 111–120 | 10/10 |
| 11 UI/UX | 121–130 | 10/10 |
| 12 Testing | 131–140 | 10/10 |
| 13 Deployment | 141–150 | 10/10 |
| **Software web scope** | **140** | **140/140** |
| **Full enterprise plan** | **150** | **140/150** |

Per-task specs: `docs/tasks/TaskXXX.md`  
Master checkbox list: `docs/CHECKLIST.md`

---

*Generated for thesis topic coverage — CamTraffic web application full system checklist.*
