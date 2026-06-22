# Technology Stack — CamTraffic

---

## Frontend

| Technology | Version / Notes | Purpose |
| --- | --- | --- |
| **React** | 18 | UI framework |
| **TypeScript** | 5.x | Typed components |
| **Vite** | 5.x | Dev server + build |
| **Tailwind CSS** | 4.x | Styling |
| **React Router** | 6.x | Client routing |
| **Axios** | — | HTTP client to REST API |
| **Recharts** | — | Dashboard charts |
| **i18n** | Custom | Khmer + English translations |

**Portals:**

| Portal | Path | URL (dev) | Roles |
| --- | --- | --- | --- |
| User | `frontend-user/` | http://localhost:5173 | Police, Driver |
| Admin | `frontend-admin/` | http://localhost:5174 | Admin |

**State management:** React Context API (Redux Toolkit not used)

---

## Backend

| Technology | Version / Notes | Purpose |
| --- | --- | --- |
| **Python** | 3.10+ | Runtime |
| **Django** | 4.2 | Web framework |
| **Django REST Framework** | — | REST API |
| **SimpleJWT** | — | JWT auth + refresh + blacklist |
| **django-cors-headers** | — | Cross-origin for dual frontends |
| **Pillow** | — | Image handling |
| **ReportLab** | — | Fine PDF export |
| **openpyxl** | — | Excel report export |
| **Resend** | — | Password reset emails |

**Key apps:** `authentication`, `users`, `vehicles`, `traffic_signs`, `violations`, `fines`, `ai_detection`, `notifications`, `infrastructure`, `dashboard`, `rbac`

---

## Database

| Technology | Notes |
| --- | --- |
| **PostgreSQL** | Production database |
| **SQLite** | Local dev (`USE_SQLITE=True` in `.env`) |

**Schema authority:** Django migrations in `backend/*/migrations/`  
**Reference docs:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [docs/ERD.md](docs/ERD.md)

---

## AI / Computer Vision

| Technology | Notes | Location |
| --- | --- | --- |
| **YOLOv8 (Ultralytics)** | 10-class Cambodian sign model | `ai/weights/best.pt` |
| **YOLOv8n COCO** | Vehicle detection | Ultralytics pretrained |
| **ByteTrack** | Live vehicle tracking IDs | `vehicle_tracking.py` |
| **OpenCV** | Preprocessing, ROI crops | `ai_detection/services.py` |
| **EasyOCR** | Latin license plate OCR | `plate_ocr.py` |
| **Gemini Vision** | Optional hybrid fallback | `gemini_service.py` |
| **edge-tts** | Khmer/English TTS | `tts.py` |

**Dataset:** `ai/dataset_10/` · **Catalog:** `ai/traffic_sign_catalog_10.json`

---

## Authentication & Security

| Feature | Implementation |
| --- | --- |
| JWT access + refresh | `rest_framework_simplejwt` |
| Token blacklist on logout | SimpleJWT blacklist app |
| Role-based access | `User.role` + RBAC models |
| OAuth 2.0 | Google + GitHub (user portal) |
| Password policy | Min 8 chars, uppercase, number, special char |
| CORS | Whitelist admin + user portal origins |

---

## Deployment (Planned / Partial)

| Technology | Status | Notes |
| --- | --- | --- |
| **Docker** | Not implemented | See Phase 15 in [TASKS.md](TASKS.md) |
| **Nginx** | Documented only | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Gunicorn** | Documented | Production WSGI server |
| **Redis** | Not implemented | Planned for cache/sessions |
| **CI/CD** | Not implemented | GitHub Actions future |
| **SSL / HTTPS** | Documented | Certbot + Nginx |

---

## External Services

| Service | Purpose | Env vars |
| --- | --- | --- |
| **Resend** | Password reset email | `RESEND_API_KEY` |
| **Google OAuth** | Social login | `GOOGLE_OAUTH_CLIENT_ID` |
| **GitHub OAuth** | Social login | `GITHUB_OAUTH_CLIENT_ID` |
| **Gemini API** | Hybrid sign detection | `GEMINI_API_KEY` |

---

## Repository Layout

```text
CamTraffic/
├── backend/              # Django REST API
├── frontend-admin/       # Admin portal (:5174)
├── frontend-user/        # Police + driver portal (:5173)
├── ai/                   # Dataset, weights, training scripts
├── docs/                 # Extended thesis + setup guides
├── scripts/              # Defense, audit, screenshot tools
├── PRD.md                # Product requirements
├── TASKS.md              # Development checklist
├── SYSTEM_FLOW.md        # Workflow diagrams
├── DATABASE_SCHEMA.md    # Database reference
├── API_SPEC.md           # REST API reference
└── TECH_STACK.md         # This file
```

---

## Development Commands

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py create_admin
python manage.py runserver

# Frontends (both portals)
npm run install:frontends
npm run dev

# Tests
python manage.py test

# AI training
cd ai
python train.py --epochs 30 --device cpu
```
