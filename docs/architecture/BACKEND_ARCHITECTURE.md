# 2. Backend Architecture — CamTraffic

Django REST Framework API serving three client portals, an AI detection pipeline, and planned camera ingest services.

> **Current:** Monolithic Django app with embedded AI inference · **Target:** Dockerized services + Redis + Celery

---

## 2.1 Layered Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│   frontend-admin (:5174)  ·  frontend-user (:5173)  ·  Cameras  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / REST (JSON + multipart)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (future: Nginx)                  │
│              /api/auth/  /api/ai/  /api/violations/  ...        │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Django REST Framework Layer                    │
│  Views → Serializers → Permissions → Pagination → Exceptions    │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Domain / Service Layer                      │
│  violations.services  ·  fines.services  ·  ai_detection.*      │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌──────────────────────┬──────────────────────┬───────────────────┐
│   PostgreSQL ORM     │   Redis (planned)    │  Celery (planned) │
│   Models/Migrations  │   Cache + sessions   │  PDF, email, KYC  │
└──────────────────────┴──────────────────────┴───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI Inference Subsystem                       │
│  YOLOv8 · OpenCV · EasyOCR · ByteTrack · Gemini (optional)      │
│  Weights: ai/weights/best.pt                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.2 URL Routing Map

Root router: `backend/camtraffic/urls.py`

| Prefix | App | Purpose | Status |
| --- | --- | --- | --- |
| `/api/auth/` | `authentication` | Login, register, JWT, OAuth, profile | ✅ |
| `/api/users/` | `users` | Admin user CRUD, driver search | ✅ |
| `/api/vehicles/` | `vehicles` | Vehicle registry | ✅ |
| `/api/signs/` | `traffic_signs` | Sign catalog + chatbot | ✅ |
| `/api/violations/` | `violations` | Violations + rule engine | ✅ |
| `/api/fines/` | `fines` | Fine management + PDF | ✅ |
| `/api/ai/` | `ai_detection` | Detect, logs, stats, TTS | ✅ |
| `/api/notifications/` | `notifications` | In-app alerts | ✅ |
| `/api/dashboard/` | `dashboard` | Analytics, evidence, exports | ✅ |
| `/api/cameras/`, `/api/roads/` | `infrastructure` | Camera + road CRUD | ✅ |
| `/api/v1/ingest/` | `ingest` (planned) | Camera telemetry + violation push | 📋 |
| `/api/v1/appeals/` | `appeals` (planned) | Appeal submit + review | 📋 |

**Future:** Migrate all routes under `/api/v1/` with backward-compatible aliases.

---

## 2.3 Authentication & Authorization

### JWT flow (SimpleJWT)

```text
POST /api/auth/login/     → access + refresh tokens
POST /api/auth/refresh/   → new access token
POST /api/auth/logout/    → blacklist refresh token
```

### Role model

| Role | DB value | Permission class | Portal |
| --- | --- | --- | --- |
| Admin | `admin` | `IsAdmin` | frontend-admin |
| Police | `police` | `IsPolice` / `IsAdminOrPolice` | frontend-user |
| Driver | `driver` | `IsAuthenticated` (scoped queries) | frontend-user |

**Extended RBAC:** `rbac` app provides `Role`, `Permission`, `UserRole` for granular permissions. Portal access primarily uses `User.role`.

### OAuth (user portal)

Google + GitHub → `authentication/oauth.py` → creates driver accounts.

---

## 2.4 AI Detection Pipeline

**Entry:** `POST /api/ai/detect/` → `ai_detection/views.py` → `pipeline.py`

```text
views.DetectSignView
      ↓
pipeline.run_detection_pipeline()
      ├── sign_pipeline.py        # OpenCV preprocess, ROI crop
      ├── services.py             # YOLO sign infer, hybrid router
      ├── yolo_class_mapping.py   # Index 0–9 → class_key
      ├── vehicle_detection.py    # YOLOv8n COCO
      ├── vehicle_tracking.py     # ByteTrack (live_scan only)
      ├── plate_ocr.py            # EasyOCR + province lookup
      ├── gemini_service.py       # Optional low-conf fallback
      ├── pipeline_enforcement.py # Violation auto-create
      └── evidence_capture.py     # Frame + crop snapshots
      ↓
models.AIDetectionLog.save()
```

### Key modules

| Module | Responsibility |
| --- | --- |
| `services.py` | YOLO inference, confidence thresholds, catalog lookup |
| `pipeline.py` | Orchestrates full upload/webcam pipeline |
| `sign_catalog_loader.py` | Loads `traffic_sign_catalog_10.json` |
| `result_compose.py` | Builds API response payload |
| `tracking_logs.py` | Persists ByteTrack session data |

### Environment toggles (`settings.py`)

| Variable | Purpose |
| --- | --- |
| `AI_USE_MOCK` | Skip real inference (demo without GPU) |
| `AI_MODEL_PATH` | Path to `best.pt` |
| `AI_DETECTION_MODE` | `local` \| `hybrid` (Gemini) |
| `AI_LIVE_YOLO_INFER_CONF` | Live webcam YOLO floor (0.50) |
| `AI_LIVE_YOLO_TRUST` | Minimum accepted confidence (50%) |
| `GEMINI_API_KEY` | Hybrid fallback |

---

## 2.5 Violation Rule Engine

**Location:** `violations/services.py`

Expert-system pattern — no ML for violation decision:

```text
Input: detected_class_key + observed_action
      ↓
Query ViolationRule (sign_class_key + prohibited_action)
      ↓
Match? → violation_type + default_fine_amount
      ↓
Create TrafficViolation (status: pending_review)
```

**Knowledge base:** `ViolationRule` seeded via `seed_violation_rules` management command.

**Human-in-the-loop:** Officer confirms/rejects before fine issuance (PRD policy).

---

## 2.6 Dashboard & Reporting

| Module | File | Output |
| --- | --- | --- |
| Admin analytics | `dashboard/views.py` | JSON stats |
| PDF reports | `dashboard/pdf_report.py` | ReportLab PDF |
| Excel export | `dashboard/excel_export.py` | openpyxl `.xlsx` |
| Evidence archive | `dashboard/evidence_archive.py` | Unified search |

---

## 2.7 Core Shared Utilities

| Module | Purpose |
| --- | --- |
| `core/permissions.py` | DRF permission classes |
| `core/pagination.py` | Standard page size |
| `core/exceptions.py` | Unified `{ success, message }` errors |

**Response envelope:** Views return `{ "success": true, "data": {...} }` via custom exception handler.

---

## 2.8 Target Architecture (Docker + Redis + Celery)

```text
                    ┌─────────────┐
                    │    Nginx    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    frontend-admin   frontend-user    /api/ → Gunicorn
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
              PostgreSQL               Redis                 Celery workers
              (persistent)         (cache + broker)      (PDF, email, ingest)
```

### Redis usage (planned)

| Key space | Purpose |
| --- | --- |
| `session:*` | Optional session store |
| `cache:dashboard:*` | Admin metrics TTL cache |
| `ratelimit:*` | API rate limiting |
| `camera:heartbeat:{id}` | Last ping fast lookup |
| Celery broker DB 0 | Task queue |

### Celery tasks (planned)

| Task | Queue | Trigger |
| --- | --- | --- |
| `generate_fine_pdf` | reports | Fine created |
| `send_fine_notification_email` | notifications | Fine issued |
| `process_kyc_upload` | kyc | KYC submit |
| `escalate_overdue_fines` | enforcement | Celery beat daily |
| `process_ingest_violation` | ingest | Camera POST |

---

## 2.9 Testing Architecture

```text
backend/tests/
├── test_e2e_pipeline.py       # Full detect → violation → fine
├── test_yolo_class_mapping.py   # Class index correctness
├── test_hybrid_detection.py     # Gemini fallback
├── test_violations.py           # Rule engine
├── test_evidence_capture.py
└── test_excel_export.py
```

**Run:** `python manage.py test` (150+ tests)

---

## 2.10 Management Commands

| Command | App | Purpose |
| --- | --- | --- |
| `create_admin` | users | Interactive admin setup |
| `seed_data` | users | Traffic signs seed |
| `seed_violation_rules` | violations | Rule engine KB |
| `evaluate_sign_accuracy` | ai_detection | TS-03 benchmark |
| `import_traffic_sign_catalog_10` | traffic_signs | Sync 10-class catalog |

---

## 2.11 Backend Dependencies (Key)

From `requirements.txt`:

- `Django`, `djangorestframework`, `djangorestframework-simplejwt`
- `django-cors-headers`, `django-filter`, `python-dotenv`
- `psycopg2-binary` (PostgreSQL)
- `Pillow`, `opencv-python-headless`, `ultralytics`, `easyocr`
- `reportlab`, `openpyxl`
- `redis`, `celery` — 📋 add when Docker stack is implemented

---

## Related

- [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- [API_SPEC.md](../../API_SPEC.md)
- [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md)
