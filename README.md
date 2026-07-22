# CamTraffic

**AI-Based Traffic Sign Detection and Traffic Law Enforcement System** — Cambodia thesis project.

Detect traffic signs and license plates with YOLO + OCR, manage violations, fines, and appeals through admin and user web portals.

## Quick start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16 (or SQLite for quick dev)
- Redis (optional — Celery)

### 1. Environment

```bash
node scripts/setup-env.mjs
# Edit src/backend/.env, src/web/admin/.env, src/web/user/.env
```

### 2. Backend

```bash
cd src/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontends

```bash
npm run install:frontends
npm run dev
```

- **User portal:** http://localhost:5173  
- **Admin portal:** http://localhost:5174  
- **API:** http://localhost:8000/api/

### Docker (full stack)

```bash
docker compose up -d --build
```

## Monorepo layout

| Path | Description |
|------|-------------|
| `src/` | **All source code** |
| `src/backend/` | Django REST API + AI pipeline |
| `src/web/admin/` | Administrator portal |
| `src/web/user/` | Police & driver portal |
| `src/web/citizen/` | Next.js citizen PWA (Enterprise v2) |
| `src/services/` | **All microservices** |
| `src/services/ai-service/` | Thesis FastAPI inference (YOLOv8 + OCR) |
| `src/services/mobile-api/` | Mobile-optimized REST (`/api/mobile/`) |
| `src/services/ai-vision/` | FastAPI AI microservice (Enterprise v2) |
| `src/services/ocr-service/` | FastAPI OCR / ANPR microservice (Enterprise v2) |
| `src/services/stream-gateway/` | RTSP ingest + frame dispatch (Enterprise v2) |
| `ai/` | AI models, datasets, training |
| `ai/weights/` | Model weights (.pt, .onnx) |
| `ai/datasets/` | Training datasets |
| `ai/training/runs/` | Training run outputs |
| `infrastructure/` | Deployment & infrastructure |
| `infrastructure/deploy/` | Production Docker & scripts |
| `packages/` | Shared `@camtraffic/*` libraries |
| `tests/` | E2E, integration, performance |
| `docs/` | PRD, SRS, thesis, checklist |

See [`FOLDER_STRUCTURE.md`](FOLDER_STRUCTURE.md) for the complete structure.

## Data import

Admin CSV/Excel bulk import: Settings → **Import Data**. See [`docs/DATA-IMPORT.md`](docs/DATA-IMPORT.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Both frontends |
| `npm run build` | Production builds |
| `npm run validate:all` | Build + backend tests |
| `npm run test:backend:phase12` | Phase 12 backend test suite |
| `npm run test:frontend` | Vitest (both portals) |
| `npm run test:e2e` | Playwright E2E (4 scenarios) |
| `npm run docker:prod:up` | Production Docker stack |
| `node scripts/validate-structure.mjs` | Check required paths |
| `node scripts/validate-env.mjs` | Check `.env.example` keys |
| `npm run seed:demo` | Demo accounts + sample data |
| `npm run validate:system` | Full validation (structure, tests) |

## Testing

```bash
npm run test:backend:phase12
npm run test:frontend
npm run test:e2e
```

## Production deployment

See [`infrastructure/deploy/README.md`](infrastructure/deploy/README.md), [`infrastructure/deploy/CAMTRAFFIC-STORE.md`](infrastructure/deploy/CAMTRAFFIC-STORE.md) (domain **camtraffic.store**), and [`docs/INSTALLATION-GUIDE.md`](docs/INSTALLATION-GUIDE.md).

```bash
npm run docker:prod:up
```

## Health checks

- `GET /health/` — liveness  
- `GET /health/ready/` — database ready  
- `GET /health/status/` — extended monitoring  

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index  
- [`docs/GOVERNMENT_WEB_SYSTEM.md`](docs/GOVERNMENT_WEB_SYSTEM.md) — Cambodia government web enforcement workflow  
- [`docs/AI-MODEL-STORY.md`](docs/AI-MODEL-STORY.md) — **canonical AI story** (10-class metrics vs 248 catalog)  
- [`docs/THESIS-ARCHITECTURE-ALIGNMENT.md`](docs/THESIS-ARCHITECTURE-ALIGNMENT.md) — thesis folder/API mapping (`src/web/`, `src/services/`)  
- [`docs/enterprise/README.md`](docs/enterprise/README.md) — **Enterprise v2 specification** (nationwide deployment)  
- [`docs/enterprise/IMPLEMENTATION-ROADMAP.md`](docs/enterprise/IMPLEMENTATION-ROADMAP.md) — v2 implementation phases  
- [`docs/CHECKLIST.md`](docs/CHECKLIST.md) — 440-task master checklist (440/440 done)  
- [`docs/INSTALLATION-GUIDE.md`](docs/INSTALLATION-GUIDE.md) — setup guide  
- [`docs/final-year-project/thesis/`](docs/final-year-project/thesis/) — thesis chapters  
- [`docs/final-year-project/DEMO-SCRIPT.md`](docs/final-year-project/DEMO-SCRIPT.md) — defense demo  

## Version

**v1.0.0** — Thesis release (July 2026). See [`docs/final-year-project/VERSION-TAG-RELEASE-NOTES.md`](docs/final-year-project/VERSION-TAG-RELEASE-NOTES.md).

## License

[MIT License](LICENSE) — source code and repository documentation.

The written thesis submitted to your university may be subject to separate academic copyright terms.
