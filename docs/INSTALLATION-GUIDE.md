# CamTraffic Installation Guide

**Version**: 1.0
**Audience**: System Administrators and DevOps Engineers

---

## Prerequisites

| Requirement | Minimum Version |
|-------------|----------------|
| OS | Ubuntu 22.04 LTS / Windows 10+ / macOS 13+ |
| Docker Engine | 24.0+ |
| Docker Compose | v2.20+ |
| Git | 2.40+ |
| Node.js | 20+ (development only) |
| Python | 3.12+ (development only) |
| GPU (optional) | CUDA 12.1+ compatible NVIDIA GPU for faster AI inference |

---

## 1. Quick Start (Docker Compose)

### 1.1 Clone the Repository

```bash
git clone https://github.com/your-org/camtraffic.git
cd camtraffic
```

### 1.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DJANGO_SECRET_KEY=your-long-random-secret-key
POSTGRES_PASSWORD=your-db-password
AI_YOLO_WEIGHTS=yolov11_camtraffic_v1.pt
```

### 1.3 Start All Services

```bash
docker compose up -d
```

This starts: `postgres`, `redis`, `backend`, `ai-service`, `celery-worker`, `frontend-admin`, `frontend-user`, `nginx`.

### 1.4 Seed the Database

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_database
```

Default superuser credentials after seed: **admin** / **admin1234** (change immediately).

### 1.5 Access the Portals

| Service | URL |
|---------|-----|
| Admin Portal | http://localhost:5173 |
| Driver Portal | http://localhost:5174 |
| Backend API | http://localhost:8000/api/v1/ |
| AI Service API | http://localhost:8001 |
| API Docs (Swagger) | http://localhost:8001/docs |

---

## 2. Production Deployment

### 2.1 SSL/TLS

Place your SSL certificates in `deploy/nginx/certs/`:

```
deploy/nginx/certs/
├── fullchain.pem
└── privkey.pem
```

Enable HTTPS in `deploy/nginx/nginx.conf`.

### 2.2 Production Compose Override

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2.3 Environment Variables (Production)

```env
DJANGO_ENV=production
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=your-domain.com
DJANGO_SECRET_KEY=<strong-random-key>
POSTGRES_DB=camtraffic_db
POSTGRES_USER=camtraffic
POSTGRES_PASSWORD=<strong-password>
REDIS_URL=redis://redis:6379/0
AI_SERVICE_URL=http://ai-service:8001
AI_DETECTION_MODE=yolo
AI_YOLO_WEIGHTS=yolov11_camtraffic_v1.pt
```

---

## 3. Development Setup (without Docker)

### 3.1 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_database
python manage.py runserver
```

### 3.2 AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Place trained weights in `ai-service/models/yolov11_camtraffic_v1.pt`.

### 3.3 Frontend (Admin Portal)

```bash
cd frontend-admin
npm install
npm run dev
```

### 3.4 Frontend (Driver Portal)

```bash
cd frontend-user
npm install
npm run dev
```

### 3.5 Celery Worker

```bash
cd backend
celery -A config.celery worker -l info
```

---

## 4. Deploy Trained AI Weights

After running the YOLO training pipeline:

```bash
cd ai-service
python training/integrate/deploy_models.py \
  --yolo-weights runs/detect/runs/yolo/camtraffic-v1/weights/best.pt \
  --target-name yolov11_camtraffic_v1.pt
```

Restart the AI service:

```bash
docker compose restart ai-service
```

---

## 5. Health Checks

```bash
# AI service
curl http://localhost:8001/health

# Backend
curl http://localhost:8000/health/

# Full integration validation
python backend/apps/integration/validate_integration.py
```

---

## 6. Database Backup

```bash
docker compose exec backend python manage.py backup_database
# or via API:
curl -X POST http://localhost:8000/api/v1/system/backup/ \
  -H "Authorization: Bearer <admin-token>"
```

---

## 7. CI/CD (GitHub Actions)

The `.github/workflows/` directory contains pipelines for:
- Lint (flake8, ruff, ESLint)
- Test (pytest, Django test runner)
- Build & push Docker images
- Deploy to staging/production

Set the following repository secrets:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `SSH_HOST`, `SSH_KEY` (for server deploy step)
- `DJANGO_SECRET_KEY` (production)

---

## 8. Structure Validation

Verify the monorepo structure is complete:

```bash
npm run validate
```

Expected output: `Structure validation PASSED. Checked NNNN files and NNN directories across NNN groups.`

---

## 9. Uninstalling

```bash
docker compose down -v   # removes containers and volumes (data loss!)
```

To keep data, omit `-v`.
