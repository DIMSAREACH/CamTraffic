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
# Edit backend/.env, frontend-admin/.env, frontend-user/.env
```

### 2. Backend

```bash
cd backend
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
| `backend/` | Django REST API + AI pipeline |
| `services/ai-vision-service/` | FastAPI AI microservice (Enterprise v2) |
| `services/ocr-service/` | FastAPI OCR / ANPR microservice (Enterprise v2) |
| `services/stream-gateway/` | RTSP ingest + frame dispatch (Enterprise v2) |
| `apps/citizen/` | Next.js citizen PWA (Enterprise v2) |
| `frontend-admin/` | Administrator portal |
| `frontend-user/` | Police & driver portal |
| `packages/` | Shared `@camtraffic/*` libraries |
| `ai/` | Weights, dataset, training |
| `deploy/` | Production Docker & scripts |
| `tests/` | E2E, integration, performance |
| `docs/` | PRD, SRS, thesis, checklist |

See [`docs/FOLDER-MAP.md`](docs/FOLDER-MAP.md) for the full tree.

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

See [`deploy/README.md`](deploy/README.md) and [`docs/INSTALLATION-GUIDE.md`](docs/INSTALLATION-GUIDE.md).

```bash
npm run docker:prod:up
```

## Health checks

- `GET /health/` — liveness  
- `GET /health/ready/` — database ready  
- `GET /health/status/` — extended monitoring  

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index  
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
