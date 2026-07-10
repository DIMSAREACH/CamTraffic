# CamTraffic

AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia.

## Architecture

| Service | Description | Port |
|---------|-------------|------|
| `frontend-admin` | Super Administrator Portal | 5173 |
| `frontend-user` | Traffic Officer & Driver Portal | 5174 |
| `backend` | Django REST API | 8000 |
| `ai-service` | YOLOv11 + OpenCV + EasyOCR | 8001 |
| `packages/` | Shared UI, API, Types, Hooks, Utils | — |

## Monorepo Structure

```text
CamTraffic/
├── frontend-admin/     # React + Vite (Admin)
├── frontend-user/      # React + Vite (Officer & Driver)
├── backend/            # Django REST API
├── ai-service/         # FastAPI AI pipeline
├── packages/
│   ├── ui/
│   ├── api/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── package.json        # npm workspaces root
└── turbo.json          # Turborepo pipeline
```

## Prerequisites

- Node.js >= 20
- npm >= 10
- Python >= 3.12
- PostgreSQL (Task 005)

## Quick Start

```bash
# Install JS dependencies
npm install

# Run all frontends (via Turborepo)
npm run dev

# Or run individually
npm run dev:admin   # http://localhost:5173
npm run dev:user    # http://localhost:5174
```

### Backend (Task 004)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API root: http://localhost:8000/api/v1/

### Docker (Task 002)

```bash
cp .env.example .env    # or: npm run setup:env
npm run validate:env
npm run docker:up
```

| Service | URL |
|---------|-----|
| Admin Portal | http://localhost:5173 |
| User Portal | http://localhost:5174 |
| Backend API | http://localhost:8000/health/ |
| AI Service | http://localhost:8001/health |

See [deploy/docker/README.md](./deploy/docker/README.md) for full Docker docs.

### AI Service (Phase 5)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Development Roadmap

Full documentation and task checklist:

- [docs/CHECKLIST-MASTER.md](./docs/CHECKLIST-MASTER.md) — unified enterprise checklist
- [docs/FOLDER-MAP.md](./docs/FOLDER-MAP.md) — folder-to-task mapping
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system architecture

Each feature folder contains a `README.md` with related tasks and implementation notes.

## Validate Structure

```bash
npm run validate          # folder/file structure (Task 010)
npm run validate:env      # environment variables
npm run validate:locales  # en/km translation parity
npm run validate:all      # run all Phase 1 checks
```
