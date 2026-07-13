# CamTraffic — Demo Accounts

**For local development, E2E tests, and thesis defense only.**  
Do not use these credentials in production.

| Role | Portal | URL | Email | Password |
|------|--------|-----|-------|----------|
| Admin | Admin | http://localhost:5174 | `admin@camtraffic.demo` | `CamTraffic@2026!` |
| Officer | User → Officer tab | http://localhost:5173 | `officer@camtraffic.demo` | `CamTraffic@2026!` |
| Driver | User → Driver tab | http://localhost:5173 | `driver@camtraffic.demo` | `CamTraffic@2026!` |
| Driver (alt) | User → Driver tab | http://localhost:5173 | `driver2@camtraffic.demo` | `CamTraffic@2026!` |

## Setup

```bash
cd backend
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

Place `ai/weights/best_v2.pt` and set in `backend/.env`:

```env
AI_USE_MOCK=False
AI_MODEL_PATH=../ai/weights/best_v2.pt
```
