# CamTraffic — Installation Guide

**Version:** 1.0 · **Date:** July 2026

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ (22 recommended) |
| PostgreSQL | 16 (optional — SQLite for quick dev) |
| Redis | 7 (optional — for Celery/cache) |
| Docker Desktop | 24+ (optional — full stack) |
| Git | 2.40+ |

**AI (optional):** CUDA GPU or CPU; YOLO weights in `ai/weights/best_v2.pt`

---

## 2. Clone repository

```bash
git clone https://github.com/SareachGenZ/CamTraffic.git
cd CamTraffic
```

---

## 3. Backend setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: SECRET_KEY, DB settings, AI_MODEL_PATH
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API: http://127.0.0.1:8000/health/

---

## 4. Frontend setup

From repo root:

```bash
npm run install:frontends
cp frontend-admin/.env.example frontend-admin/.env
cp frontend-user/.env.example frontend-user/.env
npm run dev
```

| Portal | URL |
|--------|-----|
| User (driver/officer) | http://localhost:5173 |
| Admin | http://localhost:5174 |

---

## 5. AI weights

Place trained weights at:

```
ai/weights/best_v2.pt   # production 10-class model (mAP@50 ≈ 0.908)
```

Set in `backend/.env`:

```env
AI_MODEL_PATH=../ai/weights/best_v2.pt
AI_DETECTION_MODE=local
AI_USE_MOCK=False
```

---

## 6. Docker (local stack)

```bash
# Copy env template if present, or use deploy production env
docker compose up -d --build
```

Services: PostgreSQL, Redis, backend, Celery worker.

---

## 7. Docker production stack

```bash
npm run docker:prod:up
```

See `deploy/README.md` and `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md`.

---

## 8. Celery (background tasks)

```powershell
cd backend
celery -A camtraffic worker -l info --pool=solo --concurrency=1   # Windows
celery -A camtraffic beat -l info                                # scheduler
```

Requires Redis (`USE_REDIS=True`, `CELERY_BROKER_URL`).

---

## 9. Verify installation

```bash
npm run validate:structure
npm run test:backend:phase12
npm run test:frontend
curl http://127.0.0.1:8000/health/
```

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| `database is locked` | Use PostgreSQL or close other SQLite connections |
| AI detect returns mock | Set `AI_USE_MOCK=False` and verify weights path |
| CORS errors | Add frontend origin to `CORS_ALLOWED_ORIGINS` |
| Celery crash on Windows | Use `--pool=solo` |
| Port 5173/5174 in use | Change `VITE_*_PORT` in frontend `.env` |

See also: `docs/final-year-project/MAINTENANCE-GUIDE.md`
