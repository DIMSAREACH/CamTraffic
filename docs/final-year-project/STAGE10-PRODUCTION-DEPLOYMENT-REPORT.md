# Stage 10 — Production Deployment Report

**Project:** CamTraffic · AI Traffic Sign Detection & Enforcement (Cambodia)  
**Date:** 2026-07-12 · **Phase:** 13 Deployment & DevOps

## 1. Architecture summary

Production runs as **8 Docker services** on a single VPS (Ubuntu 22.04+):

```
Internet → Nginx (443) → Django/Gunicorn → PostgreSQL
                      ↘ Celery workers → Redis
                      ↘ Static SPAs (admin + user)
```

AI inference runs **inside the Django monolith** (`backend/ai_detection/` + `ai/weights/`), with an optional `ai-worker` Celery container for async ingest.

## 2. Domain layout

| URL | Component |
|-----|-----------|
| `https://admin.camtraffic.store` | Admin React SPA |
| `https://app.camtraffic.store` | User portal (driver + officer) |
| `https://api.camtraffic.store` | REST API |
| `https://www.camtraffic.store` | Redirect → admin |

## 3. Deployment steps

### 3.1 VPS provision

```bash
sudo bash deploy/scripts/provision_vps_ubuntu.sh
```

Installs Docker, UFW (22/80/443), fail2ban.

### 3.2 Configure environment

```bash
cp deploy/env/.env.production.example deploy/env/.env.production
# Set SECRET_KEY, DB_PASSWORD, RESEND_API_KEY, DOMAIN_*
```

### 3.3 DNS

A-records for all four hosts → VPS public IP (see `deploy/ssl/README.md`).

### 3.4 Deploy

```bash
bash deploy/scripts/deploy_production.sh
```

Runs migrations, collectstatic, seeds traffic signs.

### 3.5 TLS

```bash
bash deploy/ssl/certbot-init.sh
npm run docker:prod:restart
```

## 4. Operations

| Task | Command |
|------|---------|
| View logs | `npm run docker:prod:logs` |
| Backup DB + media | `bash deploy/scripts/backup_postgres.sh` |
| Nightly backup cron | `bash deploy/scripts/install_backup_cron.sh` |
| Renew SSL | `bash deploy/ssl/certbot-renew.sh` |
| Health probe | `curl https://api.camtraffic.store/health/` |

## 5. Security controls

- TLS 1.2/1.3 + HSTS (`deploy/ssl/ssl-params.conf`)
- JWT auth, RBAC, rate limiting (Phase 3 + 12)
- `DEBUG=False`, secure cookies in `settings_production.py`
- JSON structured logs → `app_logs` volume

## 6. CI/CD

`.github/workflows/ci.yml`:

1. Structure validation  
2. Backend Phase 12 tests  
3. Frontend Vitest  
4. Docker image build (backend, celery, ai-worker)

## 7. Verification checklist

- [ ] All 8 containers healthy (`docker compose ps`)
- [ ] `/health/ready/` returns database ok
- [ ] Admin login over HTTPS
- [ ] User portal login (driver + officer tabs)
- [ ] AI detect upload returns sign class
- [ ] Celery notification after violation
- [ ] Backup archive created in `backend/backups/`

## 8. Rollback

```bash
npm run docker:prod:down
# Restore DB from pg-backup-*.sql.gz
docker compose -f deploy/docker/docker-compose.prod.yml exec -T postgres \
  psql -U camtraffic camtraffic_db < backup.sql
```

*See also: `deploy/README.md`, `docs/final-year-project/UAT-REPORT.md`*
