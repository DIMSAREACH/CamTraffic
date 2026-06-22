# 1. Folder Structure — CamTraffic

> **Legend:** ✅ exists today · 📋 planned (Docker / Redis / new modules)

---

## 1.1 Repository Root (Target)

```text
CamTraffic/
│
├── 📄 README.md                    # Project entry — read first
├── 📄 PRD.md                       # Product requirements
├── 📄 PLAN.md                      # Implementation & rollout plan
├── 📄 TASKS.md                     # Phase 1–16 checklist
├── 📄 SYSTEM_FLOW.md               # Enforcement lifecycle flows
├── 📄 DATABASE_SCHEMA.md           # Column-level DB reference
├── 📄 API_SPEC.md                  # REST API specification
├── 📄 TECH_STACK.md                # Technology stack
├── 📄 package.json                 # Root scripts (dev both frontends)
├── 📄 pnpm-workspace.yaml          # Optional monorepo workspace
│
├── 📋 docker-compose.yml           # Dev/staging orchestration
├── 📋 docker-compose.prod.yml    # Production overrides
├── 📋 .env.example                 # Root env template (Docker)
│
├── ✅ backend/                     # Django REST API
├── ✅ frontend-admin/              # Admin portal (:5174)
├── ✅ frontend-user/               # Police + driver portal (:5173)
├── ✅ ai/                          # ML dataset, training, weights
├── ✅ docs/                        # Thesis + architecture docs
├── ✅ scripts/                     # Audit, demo, dataset tools
├── 📋 infra/                       # Nginx, SSL, K8s manifests
└── 📋 .github/                     # CI/CD workflows
```

---

## 1.2 Backend — `backend/` ✅

```text
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── db.sqlite3                      # Local dev only (USE_SQLITE=True)
│
├── camtraffic/                     # Django project config
│   ├── settings.py                 # Env-based settings
│   ├── urls.py                     # Root URL router
│   ├── wsgi.py
│   └── asgi.py
│
├── core/                           # Shared utilities
│   ├── permissions.py              # IsAdmin, IsPolice, etc.
│   ├── pagination.py
│   ├── exceptions.py
│   └── management/commands/
│
├── authentication/                 # JWT, OAuth, password reset
│   ├── views.py, serializers.py, urls.py
│   ├── oauth.py, password_reset.py
│   └── templates/authentication/email/
│
├── users/                          # User, Driver, Officer profiles
├── rbac/                           # Roles, permissions (extended RBAC)
├── vehicles/                       # Vehicle registry
├── traffic_signs/                  # Sign catalog + chatbot
├── infrastructure/                 # Roads, cameras, traffic signals
├── violations/                     # Rule engine + violation records
├── fines/                          # Fine issuance + PDF
├── ai_detection/                   # ★ AI pipeline (largest app)
├── notifications/                  # In-app alerts
├── dashboard/                      # Analytics, evidence, exports
│
├── tests/                          # Integration + E2E tests
│   ├── test_e2e_pipeline.py
│   ├── test_yolo_class_mapping.py
│   └── ...
│
├── media/                          # Uploaded images (gitignored)
│   ├── profiles/
│   ├── fines/evidence/
│   └── ai_detection/
│
└── 📋 celery_app.py                # Celery config (planned)
```

### Django app → domain mapping

| App | Domain | Key models |
| --- | --- | --- |
| `authentication` | Auth | — (uses `users.User`) |
| `users` | Identity | `User`, `Driver`, `Officer`, `UserPreference` |
| `rbac` | Security | `Role`, `Permission`, `RolePermission`, `UserRole` |
| `vehicles` | Registry | `Vehicle` |
| `traffic_signs` | Knowledge base | `TrafficSign` |
| `infrastructure` | Monitoring | `Road`, `Camera`, `TrafficSignal` |
| `violations` | Enforcement | `ViolationRule`, `TrafficViolation` |
| `fines` | Citations | `Fine` |
| `ai_detection` | AI / CV | `AIDetectionLog`, `VehicleTrackingLog` |
| `notifications` | Alerts | `Notification` |
| `dashboard` | Analytics | — (read-only aggregations) |

### Planned backend apps / modules 📋

```text
backend/
├── appeals/                        # violation_appeals
├── ingest/                         # Camera telemetry + violation ingest API
├── audit/                          # audit_logs middleware + models
├── kyc/                            # Driver KYC verification (or extend users/)
└── payments/                       # Receipt upload + verify (or extend fines/)
```

---

## 1.3 AI Module — `ai/` ✅

```text
ai/
├── README.md
├── train.py                        # YOLOv8 training entry
├── build_dataset.py                # Dataset builder
├── data.yaml                       # Legacy full dataset config
├── traffic_sign_catalog_10.json    # 10-class thesis catalog
├── cambodia_stem_to_class.json     # Class name mapping
│
├── dataset_10/                     # Thesis training set
│   ├── data.yaml
│   ├── classes.txt
│   ├── images/train/, images/val/
│   └── labels/train/, labels/val/
│
├── catalog_10_signs/               # Reference sign images
├── custom_signs/                   # SVG-derived PNG assets
├── test_samples/                   # Manual test images
│
├── weights/                        # Trained models (gitignored)
│   └── best.pt                     # 10-class production weights
│
└── runs/detect/                    # Ultralytics training outputs
```

---

## 1.4 Frontend Admin — `frontend-admin/` ✅

```text
frontend-admin/
├── package.json
├── vite.config.ts
├── index.html
├── App.tsx
├── routes.tsx
├── .env.example
│
├── admin/                          # Admin-only shell
│   ├── layout/
│   │   ├── AdminLayout.tsx
│   │   └── AdminSidebar.tsx
│   └── pages/
│       └── AdminDashboard.tsx
│
├── shared/                         # Shared with frontend-user pattern
│   ├── pages/                      # Feature pages
│   │   ├── AIDetectionPage.tsx
│   │   ├── AILogsPage.tsx
│   │   ├── CamerasPage.tsx
│   │   ├── FineManagement.tsx
│   │   ├── ViolationsPage.tsx
│   │   ├── TrafficSignsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── auth/
│   │
│   ├── components/
│   │   ├── ai/                     # Pipeline UI, webcam, overlays
│   │   ├── ui/                     # shadcn-style primitives
│   │   └── layout/
│   │
│   ├── hooks/                      # useWebcamDetection, useSpeech, etc.
│   ├── context/                    # AuthContext, LanguageContext
│   ├── services/                   # axiosClient.ts, api.ts
│   ├── i18n/                       # Khmer + English translations
│   ├── utils/
│   ├── types/
│   └── styles/                     # Tailwind entry, theme, dashboard CSS
│
└── public/                         # Static assets
```

---

## 1.5 Frontend User — `frontend-user/` ✅

Same structure as `frontend-admin/` with role-specific pages:

```text
frontend-user/
├── user/                           # Driver + police shell
│   ├── layout/
│   └── pages/dashboard/
│       ├── DriverDashboard.tsx
│       └── PoliceDashboard.tsx
│
└── shared/                         # Mirrors frontend-admin/shared/
```

**Design pattern:** Dual portals share ~90% of `shared/` code; each portal has its own layout and role-gated routes.

---

## 1.6 Documentation — `docs/` ✅

```text
docs/
├── architecture/                   # ★ This folder
│   ├── README.md
│   ├── FOLDER_STRUCTURE.md
│   ├── BACKEND_ARCHITECTURE.md
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   └── DEVELOPMENT_ROADMAP.md
│
├── ERD.md                          # Full entity-relationship diagram
├── API.md                          # Extended API reference
├── DEPLOYMENT.md                   # Nginx + Gunicorn guide
├── SCHEMA.sql                      # Partial SQL DDL
├── CHAPTER3_SYSTEM_DESIGN.md       # Thesis chapter drafts
├── CHAPTER4_IMPLEMENTATION.md
├── CHAPTER5_RESULTS.md
└── reports/                        # Dataset + pipeline audit reports
```

---

## 1.7 Scripts — `scripts/` ✅

```text
scripts/
├── audit_detection_pipeline.py     # AI pipeline QA
├── audit_dataset_quality.py
├── build_dataset_10.py
├── train_dataset_10.py
├── run_defense_integration.py      # Defense demo runner
├── generate_defense_slides.py
└── benchmark_upload_vs_webcam.py
```

---

## 1.8 Infrastructure — `infra/` 📋 Planned

```text
infra/
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend-admin
│   ├── Dockerfile.frontend-user
│   ├── Dockerfile.celery
│   └── nginx/
│       ├── nginx.conf
│       └── ssl/
│
├── redis/
│   └── redis.conf
│
└── kubernetes/                     # Optional production scale
    ├── backend-deployment.yaml
    ├── postgres-statefulset.yaml
    └── ingress.yaml
```

---

## 1.9 Docker Compose Layout 📋 Planned

```text
docker-compose.yml services:

  postgres      → PostgreSQL 16
  redis         → Redis 7 (cache + Celery broker)
  backend       → Django + Gunicorn
  celery        → Background workers
  celery-beat   → Scheduled tasks (fine reminders)
  frontend-admin → Nginx serving Vite build OR dev proxy
  frontend-user  → Nginx serving Vite build OR dev proxy
  nginx         → Reverse proxy :80/:443 → frontends + /api/
```

---

## 1.10 Environment Files

| File | Scope | Status |
| --- | --- | --- |
| `backend/.env` | Django secrets, DB, AI keys | ✅ |
| `frontend-admin/.env` | `VITE_API_URL` | ✅ |
| `frontend-user/.env` | `VITE_API_URL` | ✅ |
| `.env` (root) | Docker Compose variables | 📋 |
| `.env.example` (each) | Templates committed to git | ✅ |

**Never commit:** `.env`, `venv/`, `node_modules/`, `ai/weights/`, `backend/media/`

---

## 1.11 Naming Conventions

| Layer | Convention | Example |
| --- | --- | --- |
| Django apps | lowercase, singular domain | `ai_detection` |
| Django models | PascalCase singular | `TrafficViolation` |
| DB tables | snake_case plural | `traffic_violations` |
| API paths | lowercase, trailing slash | `/api/violations/` |
| React components | PascalCase | `AIDetectionPage.tsx` |
| React hooks | camelCase, `use` prefix | `useWebcamDetection.ts` |
| Shared frontend | `shared/` directory in each portal | DRY between portals |

---

## Related

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)
- [TECH_STACK.md](../../TECH_STACK.md)
