# CamTraffic

**AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

Final-year thesis project: an intelligent transportation platform with role-based access for **Administrator**, **Traffic Police**, and **Drivers**. Automates Cambodian traffic sign detection (YOLOv8), vehicle tracking (ByteTrack), license plate OCR (EasyOCR), violation evaluation (rule engine), evidence capture, and fine management.

---

## Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS 4, Axios, React Router |
| **Backend** | Python 3.10+, Django 4.2, Django REST Framework, SimpleJWT |
| **Database** | PostgreSQL (production) · SQLite (local dev) |
| **AI / CV** | YOLOv8, OpenCV, EasyOCR, ByteTrack, optional Gemini Vision |
| **Deployment** | Gunicorn + Nginx (documented) · Docker planned |

**Portals:** Admin `:5174` · User (police + driver) `:5173`

---

## Documents (read these first)

| File | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Product requirements — objectives, roles, functional requirements |
| [PLAN.md](PLAN.md) | 12-month implementation, QA, deployment, and rollout plan |
| [TASKS.md](TASKS.md) | Development checklist — Phase 1–16 with checkboxes (~53% done) |
| [SYSTEM_FLOW.md](SYSTEM_FLOW.md) | End-to-end workflow — camera → AI → violation → fine |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Tables, columns, relationships |
| [API_SPEC.md](API_SPEC.md) | REST API endpoints and request/response formats |
| [TECH_STACK.md](TECH_STACK.md) | Technology choices and repo layout |
| [docs/architecture/](docs/architecture/README.md) | **Professional structure** — folder layout, backend/frontend architecture, DB design, roadmap |

**Extended docs:** [docs/ERD.md](docs/ERD.md) · [docs/API.md](docs/API.md) · [DEMO_SCRIPT.md](DEMO_SCRIPT.md) · [TASK.md](TASK.md) (detailed defense tracker)

---

## Goal

Build a production-ready traffic law enforcement platform with:

- Admin Dashboard — analytics, users, signs, cameras, AI logs, reports
- Officer Dashboard — live detection, violation review, fine issuance, evidence
- Citizen Dashboard — vehicles, fines, notifications, sign learning
- AI Traffic Sign Detection — 10-class Cambodian YOLO model + optional Gemini hybrid
- License Plate Recognition — Latin plates with province lookup
- Fine Management — create, status workflow, PDF export
- Appeals System — planned (Phase 9)
- Real-Time Monitoring — browser webcam + IP camera snapshot poll

---

## Repository Layout

```text
CamTraffic/
├── backend/              # Django REST API + AI detection pipeline
├── frontend-admin/       # Admin portal (:5174)
├── frontend-user/        # Police + driver portal (:5173)
├── ai/                   # Dataset, weights (best.pt), training scripts
├── docs/                 # Thesis chapters, ERD, deployment guides
├── scripts/              # Defense demo, audit, screenshot tools
├── PRD.md
├── TASKS.md
├── SYSTEM_FLOW.md
├── DATABASE_SCHEMA.md
├── API_SPEC.md
└── TECH_STACK.md
```

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env           # USE_SQLITE=True by default
python manage.py migrate
python manage.py create_admin
python manage.py runserver
```

### Frontend (both portals)

```bash
npm run install:frontends
npm run dev
```

| Portal | URL |
| --- | --- |
| User (driver / police) | http://localhost:5173 |
| Admin | http://localhost:5174 |

### Tests

```bash
cd backend
python manage.py test
```

---

## For AI Coding Agents

Use this prompt to continue development:

```text
Read README.md, PRD.md, TASKS.md, SYSTEM_FLOW.md, DATABASE_SCHEMA.md, TECH_STACK.md,
and docs/architecture/ (folder structure, backend/frontend architecture, DB design, roadmap).

This is an existing CamTraffic codebase (~53% complete). Do not rebuild from scratch.

Continue from TASKS.md — pick the next unchecked high-priority item and implement it using:
- React + TailwindCSS (frontend-admin + frontend-user)
- Django REST Framework (backend/)
- PostgreSQL (migrations in backend/*/migrations/)
- YOLOv8 + EasyOCR (ai_detection app)

Match existing code conventions. Run tests after changes.
```

**Suggested build order for new features:**

1. Database model + migration
2. Serializer + view + URL
3. Frontend API client + page/component
4. Test in `backend/tests/`

---

## Current Status (~53%)

| Complete | In Progress | Not Started |
| --- | --- | --- |
| Auth (JWT, OAuth, RBAC) | KYC, payment receipts | Appeals system |
| 10-class YOLO sign model | RTSP, camera heartbeat | Docker / CI/CD |
| Violation rule engine | Khmer plate OCR | Redis cache |
| Fine management + PDF | Maps / heatmaps | AI model admin UI |
| Dual React dashboards | Daily/weekly reports | Audit logs |

See [TASKS.md](TASKS.md) for the full checklist.

---

## License

Academic / thesis project — CamTraffic © 2024–2026
