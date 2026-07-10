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

## 2. Production Deployment (Ubuntu 22.04 VPS)

### 2.1 Provision the VPS host

Run on the target server (recommended: >= 4 vCPU, >= 8 GB RAM):

```bash
sudo ./deploy/scripts/provision_vps_ubuntu.sh
```

This installs Docker Engine, Docker Compose plugin, and configures firewall rules for 22/80/443.

### 2.2 Configure production environment

```bash
cp deploy/env/.env.production.example .env.production
```

Edit `.env.production` and set at minimum:

```env
POSTGRES_PASSWORD=<strong-password>
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_ALLOWED_HOSTS=api.camtraffic.kh,admin.camtraffic.kh,app.camtraffic.kh
VITE_API_URL=https://api.camtraffic.kh
VITE_AI_SERVICE_URL=https://ai.camtraffic.kh
```

### 2.3 Configure DNS A records

Point these domains to your VPS public IP:

- `admin.camtraffic.kh`
- `app.camtraffic.kh`
- `api.camtraffic.kh`
- `ai.camtraffic.kh`

### 2.4 Bring up production stack

```bash
docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production up --build -d
```

Or use the automation script:

```bash
./deploy/scripts/deploy_production.sh /opt/camtraffic
```

### 2.5 Run database migration and seed

```bash
docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production exec -T backend python manage.py migrate --noinput
docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production exec -T backend python manage.py seed_database
```

### 2.6 Obtain SSL certificates (Let's Encrypt)

```bash
sh deploy/ssl/certbot-init.sh camtraffic.kh admin@camtraffic.kh
```

Then enable HTTPS server blocks in `deploy/nginx/camtraffic.conf` and restart nginx.

### 2.7 Verify production health

```bash
./deploy/scripts/healthcheck_production.sh /opt/camtraffic
```

### 2.8 Configure daily database backup

```bash
sudo ./deploy/scripts/install_backup_cron.sh /opt/camtraffic /opt/camtraffic/backups "0 2 * * *"
```

Manual backup test:

```bash
./deploy/scripts/backup_postgres.sh /opt/camtraffic /opt/camtraffic/backups
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

Automated backup uses `pg_dump` from the running PostgreSQL container:

```bash
./deploy/scripts/backup_postgres.sh /opt/camtraffic /opt/camtraffic/backups
```

Daily cron setup:

```bash
sudo ./deploy/scripts/install_backup_cron.sh /opt/camtraffic /opt/camtraffic/backups "0 2 * * *"
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
