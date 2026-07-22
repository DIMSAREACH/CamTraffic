# CamTraffic Folder Structure

**Government-Standard Project Organization**

Last updated: July 23, 2026

---

## Overview

This project follows a clean, government-standard folder structure with clear separation of concerns:
- **Source code** in `src/`
- **AI/ML components** in `ai/`
- **Infrastructure** in `infrastructure/`
- **Documentation** in `docs/`
- **Tests** in `tests/`

---

## Root Structure

```
CamTraffic/
├── src/                          # All source code
├── ai/                           # AI/ML models and datasets
├── infrastructure/               # Deployment and infrastructure
├── docs/                         # All documentation
├── tests/                        # All tests
├── scripts/                      # Project utility scripts
├── packages/                     # Shared libraries
├── .cursor/                      # Cursor IDE settings
├── .github/                      # GitHub workflows
├── .venv/                        # Python virtual environment (gitignored)
├── node_modules/                 # NPM dependencies (gitignored)
└── [config files]                # Root configuration files
```

---

## Detailed Structure

### `src/` — Source Code

All application source code organized by type:

```
src/
├── backend/                      # Django REST API
│   ├── api/                      # API endpoints
│   ├── core/                     # Core app configuration
│   ├── users/                    # User management
│   ├── violations/               # Violation tracking
│   ├── fines/                    # Fine management
│   ├── appeals/                  # Appeal system
│   ├── manage.py
│   ├── requirements.txt
│   └── ...
│
├── web/                          # Web applications
│   ├── admin/                    # Administrator portal
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── user/                     # Police & driver portal
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── citizen/                  # Citizen PWA (Enterprise v2)
│       ├── app/
│       ├── components/
│       ├── package.json
│       └── next.config.js
│
└── services/                     # Microservices
    ├── ai-service/               # Thesis AI service
    │   ├── app/
    │   ├── models/
    │   ├── requirements.txt
    │   └── main.py
    │
    ├── mobile-api/               # Mobile-optimized API
    │   ├── routes/
    │   ├── requirements.txt
    │   └── main.py
    │
    ├── ai-vision/                # Enterprise AI vision (v2)
    │   ├── detection/
    │   ├── tracking/
    │   └── ...
    │
    ├── ocr-service/              # OCR/ANPR service (v2)
    │   ├── engines/
    │   ├── preprocessing/
    │   └── ...
    │
    └── stream-gateway/           # RTSP ingest (v2)
        ├── ingest/
        ├── dispatch/
        └── ...
```

### `ai/` — AI/ML Components

All AI models, datasets, and training materials:

```
ai/
├── datasets/                     # Training datasets
│   ├── raw/                      # Raw/source data
│   │   ├── vehicles/
│   │   ├── license_plates/
│   │   ├── traffic_signs/
│   │   └── road_footage/
│   │
│   ├── processed/                # Processed datasets
│   │   └── yolo_format/
│   │
│   ├── annotations/              # Annotation files
│   │   ├── cvat_tasks/
│   │   ├── ocr/
│   │   └── exports/
│   │
│   └── splits/                   # Train/val/test splits
│
├── weights/                      # Model weights
│   ├── pretrained/               # Pre-trained weights
│   │   ├── yolo11n.pt
│   │   ├── yolov8n.pt
│   │   └── ...
│   │
│   └── trained/                  # Custom trained models
│       ├── traffic_signs.pt
│       ├── vehicles.pt
│       └── ...
│
├── models/                       # Exported models
│   ├── *.onnx                    # ONNX exports
│   └── *.torchscript            # TorchScript exports
│
├── training/                     # Training components
│   ├── configs/                  # Training configurations
│   │   ├── yolo_traffic.yaml
│   │   └── ...
│   │
│   └── runs/                     # Training run outputs
│       └── detect/
│           ├── camtraffic-v1/
│           ├── camtraffic-v2/
│           └── ...
│
├── scripts/                      # AI utility scripts
│   ├── train.py
│   ├── evaluate.py
│   ├── export.py
│   └── ...
│
├── data.yaml                     # Dataset configuration
├── DATASETS.md                   # Dataset documentation
└── requirements.txt              # AI dependencies
```

### `infrastructure/` — Deployment & Infrastructure

All deployment configurations and infrastructure code:

```
infrastructure/
└── deploy/                       # Deployment configurations
    ├── docker/                   # Docker configurations
    │   ├── backend.Dockerfile
    │   ├── frontend.Dockerfile
    │   └── ...
    │
    ├── ssl/                      # SSL certificates
    │   ├── README.md
    │   └── ...
    │
    ├── scripts/                  # Deployment scripts
    │   ├── backup.sh
    │   ├── restore.sh
    │   └── ...
    │
    ├── README.md
    ├── CAMTRAFFIC-STORE.md
    └── docker-compose.prod.yml
```

### `docs/` — Documentation

All project documentation:

```
docs/
├── architecture/                 # Architecture documents
├── api/                          # API documentation
├── deployment/                   # Deployment guides
├── enterprise/                   # Enterprise v2 specifications
├── final-year-project/           # Thesis documents
│   ├── thesis/                   # Thesis chapters
│   ├── DEMO-SCRIPT.md
│   └── ...
│
├── README.md                     # Documentation index
├── INSTALLATION-GUIDE.md
├── CHECKLIST.md
├── FOLDER-MAP.md                 # (deprecated, see FOLDER_STRUCTURE.md)
└── ...
```

### `tests/` — Tests

All test suites:

```
tests/
├── e2e/                          # End-to-end tests
│   ├── scenarios/
│   └── ...
│
├── integration/                  # Integration tests
│   ├── api/
│   └── ...
│
├── unit/                         # Unit tests
│   ├── backend/
│   └── frontend/
│
├── security/                     # Security tests
│   ├── README.md
│   └── ...
│
└── performance/                  # Performance tests
```

### `scripts/` — Project Utilities

Project-level utility scripts:

```
scripts/
├── setup/                        # Setup scripts
│   ├── setup-env.mjs
│   └── ...
│
├── validation/                   # Validation scripts
│   ├── validate-structure.mjs
│   ├── validate-env.mjs
│   └── ...
│
└── data/                         # Data management
    ├── seed-demo.mjs
    └── ...
```

### `packages/` — Shared Libraries

Shared libraries for monorepo:

```
packages/
├── shared-types/                 # TypeScript types
├── ui-components/                # Shared UI components
└── utils/                        # Utility functions
```

---

## Key Changes from Previous Structure

### ✅ Improvements

1. **Consolidated Source Code**: All application code in `src/` directory
2. **Organized Services**: All microservices in `src/services/`
3. **Organized Web Apps**: All frontends in `src/web/`
4. **Clean AI Structure**: Organized AI components in `ai/` with clear subdirectories
5. **Infrastructure Rename**: `deploy/` → `infrastructure/deploy/` for clarity
6. **Removed Duplicates**: Deleted `AI_Traffic_System_Dataset/` duplicate structure
7. **Cleaner Root**: Reduced from 23+ to ~13 root folders

### 🗑️ Removed

- `AI_Traffic_System_Dataset/` — Duplicate/experimental structure
- `frontend/` — Empty pointer folder
- `apps/` — Merged into `src/web/`
- `services/` — Merged into `src/services/`
- `ai_service/` → `src/services/ai-service/`
- `mobile_api/` → `src/services/mobile-api/`
- `frontend-admin/` → `src/web/admin/`
- `frontend-user/` → `src/web/user/`
- `deploy/` → `infrastructure/deploy/`
- `runs/` — Consolidated into `ai/training/runs/`
- `tmp_debug_ai.py` — Temporary debug file
- Weight files at root → `ai/weights/pretrained/`

### 📦 Path Mapping

| Old Path | New Path |
|----------|----------|
| `backend/` | `src/backend/` |
| `frontend-admin/` | `src/web/admin/` |
| `frontend-user/` | `src/web/user/` |
| `apps/citizen/` | `src/web/citizen/` |
| `ai_service/` | `src/services/ai-service/` |
| `mobile_api/` | `src/services/mobile-api/` |
| `services/ai-vision-service/` | `src/services/ai-vision/` |
| `services/ocr-service/` | `src/services/ocr-service/` |
| `services/stream-gateway/` | `src/services/stream-gateway/` |
| `deploy/` | `infrastructure/deploy/` |
| `ai/runs/` | `ai/training/runs/` |
| `yolo*.pt` (root) | `ai/weights/pretrained/` |

---

## Configuration Updates

After restructuring, the following files need path updates:

- ✅ `README.md` — Updated
- ⚠️ `docker-compose.yml` — Check service paths
- ⚠️ `package.json` — Check script paths
- ⚠️ `turbo.json` — Check workspace paths
- ⚠️ `.github/workflows/*` — Check CI/CD paths
- ⚠️ Various documentation files

---

## Benefits

1. **Professional Structure**: Follows government and enterprise standards
2. **Clear Organization**: Intuitive folder hierarchy
3. **Scalable**: Easy to add new services or apps
4. **Maintainable**: Logical grouping reduces confusion
5. **Cleaner Git**: Less clutter in root directory
6. **Better Navigation**: Easier to find files
7. **Team-Friendly**: New developers understand structure quickly

---

## Migration Notes

- All changes are on the `restructure-project` branch
- Original structure preserved in git history
- Can rollback if needed with: `git checkout main`
- Test all paths after merging to main
- Update team documentation after merge

---

## Related Documents

- [`README.md`](README.md) — Project overview with new paths
- [`RESTRUCTURE_PLAN.md`](RESTRUCTURE_PLAN.md) — Detailed migration plan
- [`docs/INSTALLATION-GUIDE.md`](docs/INSTALLATION-GUIDE.md) — Setup guide
- [`docs/THESIS-ARCHITECTURE-ALIGNMENT.md`](docs/THESIS-ARCHITECTURE-ALIGNMENT.md) — Architecture alignment
