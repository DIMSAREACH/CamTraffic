# CamTraffic — Demo Accounts

**For local development, E2E tests, and thesis defense only.**  
Do not use these credentials in production.

| Role | Portal | URL | Email | Password |
|------|--------|-----|-------|----------|
| Admin | Administration | http://localhost:5174 → `/admin` | `admin@camtraffic.demo` | `CamTraffic@2026!` |
| Officer | Traffic Operations | http://localhost:5173 → `/officer` | `officer@camtraffic.demo` | `CamTraffic@2026!` |
| Driver | Citizen Service | http://localhost:5173 → `/citizen` | `driver@camtraffic.demo` | `CamTraffic@2026!` |
| Driver (alt) | Citizen Service | http://localhost:5173 → `/citizen` | `driver2@camtraffic.demo` | `CamTraffic@2026!` |

## Setup

```bash
cd src/backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

From repo root:

```bash
npm run setup:env
npm run seed:demo
npm run dev
```

Phase A status: [`PHASE-A-READY.md`](PHASE-A-READY.md)  
Test images: `ai/test_samples/demo_*.png`

Reset demo passwords:

```bash
npm run seed:demo -- --reset-passwords
```

## UI configuration (both portals)

Both frontends use the same shared layer when `VITE_USE_MOCK=false`:

| Setting | Admin (`frontend-admin/.env`) | User (`frontend-user/.env`) |
|---------|--------------------------------|------------------------------|
| `VITE_API_URL` | `/api` | `/api` |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | `http://127.0.0.1:8000` |
| `VITE_USE_MOCK` | `false` | `false` |
| `VITE_PORTAL_SURFACE` | `admin` | `user` |

Run `npm run setup:env` to copy `.env.example` → `.env` if missing.

## Sample data included

- Traffic sign catalog (11 signs)
- Violation rules (10-class YOLO mapping)
- Sample vehicle `2A-1234` for `driver@camtraffic.demo`
- Sample fines and notifications (when police + driver exist)

## AI weights

Place `ai/weights/best.pt` and set in `src/backend/.env` (248-class live default):

```env
AI_USE_MOCK=False
AI_MODEL_PATH=../ai/weights/best.pt
```

For thesis mAP demo only, switch temporarily to `best_v2.pt` (10-class).
Canonical explanation: [`docs/AI-MODEL-STORY.md`](../AI-MODEL-STORY.md)