# Final Deployment Guide

**Task 157 — Final Year Project**
**Date**: 2026-07
**Target**: Production-ready Docker Compose deployment

---

## 1. Production Deployment Checklist

### 1.1 Infrastructure
- [ ] Server: Ubuntu 22.04 LTS, ≥ 4 CPU cores, ≥ 8 GB RAM, ≥ 50 GB SSD
- [ ] Docker Engine 24+ and Docker Compose v2 installed
- [ ] Ports 80, 443 open in firewall; 5173, 5174, 8000, 8001 internal only
- [ ] Domain name configured (A record → server IP)
- [ ] SSL certificates obtained (Let's Encrypt or CA-signed)
- [ ] SSH key authentication configured; root login disabled

### 1.2 Application
- [ ] Repository cloned to `/opt/camtraffic`
- [ ] `.env` configured with production values (see Section 2)
- [ ] Trained YOLO weights deployed to `ai-service/models/yolov11_camtraffic_v1.pt`
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml build`
- [ ] `docker compose up -d`
- [ ] `docker compose exec backend python manage.py migrate`
- [ ] `docker compose exec backend python manage.py seed_database`
- [ ] Admin password changed from default immediately after seed

### 1.3 Verification
- [ ] `curl https://your-domain.com/health/` → 200 OK
- [ ] `curl https://your-domain.com/api/v1/health/` → 200 OK
- [ ] `curl http://localhost:8001/health` (internal) → all components OK
- [ ] Admin portal loads at `https://your-domain.com`
- [ ] Login succeeds; dashboard renders
- [ ] Camera frame submission processes successfully

---

## 2. Production Environment Variables

```env
# Django
DJANGO_ENV=production
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<strong-random-50-char-key>
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database
POSTGRES_DB=camtraffic_prod
POSTGRES_USER=camtraffic
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgres://camtraffic:<password>@postgres:5432/camtraffic_prod

# Redis & Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# AI Service
AI_SERVICE_URL=http://ai-service:8001
AI_DETECTION_MODE=yolo
AI_YOLO_WEIGHTS=yolov11_camtraffic_v1.pt

# CORS / Frontend
CORS_ALLOWED_ORIGINS=https://your-domain.com
FRONTEND_ADMIN_URL=https://your-domain.com
FRONTEND_USER_URL=https://your-domain.com/user

# Email (optional, for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=noreply@your-domain.com
EMAIL_HOST_PASSWORD=<app-password>
DEFAULT_FROM_EMAIL=CamTraffic <noreply@your-domain.com>
```

---

## 3. Service Health Summary

| Service | URL | Health Endpoint |
|---------|-----|----------------|
| Backend | `:8000` | `GET /health/` |
| AI Service | `:8001` | `GET /health` |
| Admin Portal | `:5173` / `:443` | HTTP 200 on index |
| PostgreSQL | `:5432` | `pg_isready` |
| Redis | `:6379` | `redis-cli ping` |
| Celery | — | `celery -A config.celery inspect ping` |

---

## 4. Deployment Runbook

### Rolling Update

```bash
cd /opt/camtraffic
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose up -d --no-deps --build backend ai-service celery-worker
docker compose exec backend python manage.py migrate
```

### Update AI Weights Only

```bash
# Copy new weights to server
scp best.pt user@server:/opt/camtraffic/ai-service/models/yolov11_camtraffic_v1.pt
# Restart AI service (zero-downtime)
docker compose restart ai-service
```

### Backup Database

```bash
docker compose exec postgres pg_dump -U camtraffic camtraffic_prod > backup_$(date +%Y%m%d).sql
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f ai-service
docker compose logs -f celery-worker
```

---

## 5. Monitoring

- Celery Flower (task monitor): available at `:5555` if enabled
- Django admin: `https://your-domain.com/admin/`
- System health API: `GET /api/v1/monitoring/status/`
- Audit logs: `GET /api/v1/audit/` (admin token required)

---

## 6. CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. `Lint` — ruff, ESLint
2. `Test` — pytest, Django test runner
3. `Build` — docker build and push to registry
4. `Deploy` — SSH to server, pull image, restart services

Required repository secrets:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `SSH_HOST`, `SSH_USER`, `SSH_KEY`
- `DJANGO_SECRET_KEY` (production)
