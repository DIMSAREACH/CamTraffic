# Phase 14 — Documentation (Tasks 361–380)

> Status: ✅ Complete — 20/20 complete
> Folder: `docs/`

---

## Complete ✅

- **361** — PRD → `docs/PRD.md`
- **362** — SRS → `docs/SRS.md`
- **363** — API Documentation → `backend/docs/API.md`
- **364** — Database Documentation → ER diagram, schema descriptions
- **365** — User Manual → `docs/USER-MANUAL.md`
- **366** — Installation Guide → `docs/INSTALLATION-GUIDE.md`
- **367** — Thesis Documentation → `docs/THESIS.md`
- **368** — Architecture Diagrams → `docs/ARCHITECTURE-DIAGRAMS.md`
- **369** — Deployment Guide → `deploy/README.md`
- **370** — Developer Guide → per-package READMEs

---

## Task 371 — Use Case Diagram ⬜

**Objective:** Create a formal use case diagram showing all actors and system use cases.

**Actors:**
- Super Admin
- Admin
- Officer
- Driver
- Camera (external system)
- AI Service (system)

**Use Cases (minimum 20):**
- Login / Logout
- Manage Users (Admin)
- Manage Cameras (Admin)
- View Dashboard (Admin/Officer)
- Submit Frame for AI Detection (Officer/Camera)
- Review Violation (Officer)
- Approve/Reject Appeal (Officer)
- View Own Violations (Driver)
- Submit Appeal (Driver)
- Pay Fine (Driver)
- Generate Reports (Admin/Officer)
- Manage AI Models (Admin)
- View Audit Logs (Super Admin)
- Configure Notifications (Admin)
- Backup System (Super Admin)

**Tool:** draw.io (free at app.diagrams.net)

**Save as:** `docs/diagrams/use-case-diagram.drawio` + export PNG to `docs/diagrams/use-case-diagram.png`

**Acceptance Criteria:**
- [ ] All 4 user roles shown as actors
- [ ] ≥ 20 use cases
- [ ] Include/extend relationships where appropriate
- [ ] PNG exported at ≥ 1200px width
- [ ] Referenced in thesis Chapter 4

---

## Task 372 — Class Diagram ⬜

**Objective:** Create a class diagram for the core Django models.

**Classes to include:**
```
User (id, email, role, is_active)
    ↓ 1-to-1
UserRole (role_id, user_id)
    ↓
Role (id, name, slug)
    ↓ M2M
Permission (id, name, codename)

Camera (id, name, location, status, rtsp_url)
    ↓ 1-to-many
Detection (id, camera_id, image_path, timestamp)
    ↓
AIResult (id, detection_id, class_label, confidence, bbox)
    ↓
OCRResult (id, detection_id, plate_text, confidence)
    ↓
Violation (id, detection_id, driver_id, status)
    ↓
Fine (id, violation_id, amount, status)
    ↓
Appeal (id, fine_id, reason, status, decision)

Vehicle (id, driver_id, plate_number, type)
Officer (id, user_id, station_id, badge_number)
PoliceStation (id, name, location)
```

**Tool:** draw.io

**Save as:** `docs/diagrams/class-diagram.drawio` + PNG

---

## Task 373 — Sequence Diagram ⬜

**Objective:** Create sequence diagram for the core violation creation flow.

**Flow:**
```
Camera → POST /process-frame/ → AI Service
AI Service → YOLO Detect → OCR Read Plate
AI Service → POST /api/v1/detections/ → Backend
Backend → Match plate → vehicles table
Backend → Create Violation → violations table
Backend → Celery → Send Notification → Officer
Backend → SSE → Live Dashboard
Officer → Review → Approve/Reject
Backend → Create Fine → fines table
Backend → Notify Driver → notifications table
Driver → View Violation → Submit Appeal
```

**Tool:** draw.io or sequence diagram tool (sequencediagram.org)

**Save as:** `docs/diagrams/sequence-violation-flow.png`

---

## Task 374 — Deployment Diagram ⬜

**Objective:** Create deployment diagram showing production server topology.

**Components:**
```
Internet
    ↓ HTTPS
┌─── VPS Server ─────────────────────────────┐
│  Nginx (80/443)                             │
│    → admin.domain.kh → admin container      │
│    → app.domain.kh → user container         │
│    → api.domain.kh → gunicorn:8000          │
│    → ai.domain.kh → uvicorn:8001            │
│                                             │
│  Docker Network: camtraffic-net             │
│  ├── backend:8000 (Django/Gunicorn)         │
│  ├── ai-service:8001 (FastAPI/Uvicorn)      │
│  ├── frontend-admin:80                      │
│  ├── frontend-user:80                       │
│  ├── postgres:5432                          │
│  ├── redis:6379                             │
│  ├── celery-worker                          │
│  └── celery-beat                            │
└─────────────────────────────────────────────┘
```

**Save as:** `docs/diagrams/deployment-diagram.png`

---

## Task 375 — Admin Manual ⬜

**Objective:** Update `docs/USER-MANUAL.md` Admin section with real screenshots.

**Sections to add screenshots:**
- Dashboard home with real data
- User management list
- Camera management
- AI detection monitoring
- Report generation

**How to capture:**
1. Run `docker compose up --build`
2. Open http://localhost:5173
3. Login as super_admin
4. Navigate to each section and screenshot

---

## Task 376 — Officer Manual ⬜

**Objective:** Add Officer Portal section with real screenshots and workflow.

**Key workflows to document:**
1. Submit frame for AI detection
2. Review violation → approve
3. View camera live feed
4. Generate officer report

---

## Task 377 — Driver Manual ⬜

**Objective:** Add Driver Portal section with real screenshots and workflow.

**Key workflows to document:**
1. View my violations
2. View evidence (detection image)
3. Submit an appeal
4. Check fine status

---

## Task 378 — Maintenance Guide ⬜

**File:** `docs/MAINTENANCE-GUIDE.md`

**Contents:**
- How to check service health: `docker compose ps`, `GET /health/`
- How to view logs: `npm run docker:logs`
- How to update AI model weights: replace `best.pt`, restart ai-service
- How to restore database: `pg_restore` steps
- How to add a new traffic sign class: dataset → annotate → retrain → deploy
- Monthly maintenance checklist

---

## Task 379 — Glossary ⬜

**File:** `docs/GLOSSARY.md`

**Includes:**
- Traffic sign terms in Khmer + English
- AI/ML terms (mAP, IoU, bounding box, class, epoch)
- System terms (RBAC, JWT, SSE, RTSP, ANPR, OCR)
- Cambodia-specific terms (MPWT, MoI, plate formats)

---

## Task 380 — Final Documentation Review ⬜

**Checklist:**
- [ ] All `docs/` files exist and open correctly
- [ ] All internal `[links](./path)` resolve
- [ ] All 4 UML diagrams exported as PNG
- [ ] User Manual has real screenshots
- [ ] API documentation matches actual endpoints
- [ ] Installation Guide tested from clean machine
- [ ] All diagrams referenced from thesis Chapter 4
- [ ] GLOSSARY.md complete
- [ ] README.md updated with live URL
