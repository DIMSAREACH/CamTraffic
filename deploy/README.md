# CamTraffic — Production Deployment

**Phase 13** · Folder: `deploy/`

## Stack (8 services)

| Service | Image / Dockerfile | Role |
|---------|-------------------|------|
| `postgres` | postgres:16-alpine | Primary database |
| `redis` | redis:7-alpine | Cache + Celery broker (AOF) |
| `backend` | `deploy/docker/Dockerfile.backend.prod` | Django + Gunicorn + YOLO |
| `celery-worker` | `deploy/celery/Dockerfile.worker` | Reports, notifications |
| `celery-beat` | `deploy/celery/Dockerfile.worker` | Scheduled tasks |
| `ai-worker` | `deploy/docker/Dockerfile.ai-service.prod` | AI ingest queue |
| `nginx` | `deploy/docker/Dockerfile.nginx.prod` | TLS, 4 vhosts, static SPAs |
| `certbot` | certbot/certbot (profile `ssl`) | Certificate renewal |

## Quick start

From the **repo root** (not `backend/`):

```bash
npm run docker:prod:up
```

This auto-creates `deploy/env/.env.production` from the example on first run.

Or manually:

```bash
cp deploy/env/.env.production.example deploy/env/.env.production
bash deploy/scripts/deploy_production.sh
```

## npm scripts

| Script | Action |
|--------|--------|
| `npm run docker:prod:up` | Build + start stack |
| `npm run docker:prod:down` | Stop stack |
| `npm run docker:prod:logs` | Follow logs |
| `npm run docker:prod:restart` | Restart nginx |

## VPS provisioning

```bash
sudo bash deploy/scripts/provision_vps_ubuntu.sh
git clone https://github.com/SareachGenZ/CamTraffic.git /opt/camtraffic
cd /opt/camtraffic && bash deploy/scripts/deploy_production.sh
```

## SSL + DNS

1. Point DNS A-records (see `deploy/ssl/README.md`)
2. `bash deploy/ssl/certbot-init.sh`
3. `npm run docker:prod:restart`

## Backups

```bash
bash deploy/scripts/backup_postgres.sh
bash deploy/scripts/install_backup_cron.sh   # nightly cron
```

## Health checks

- `GET /health/` — liveness
- `GET /health/ready/` — DB ready
- `GET /health/status/` — extended monitoring

## CI/CD

GitHub Actions: `.github/workflows/ci.yml` — validate, test, Docker build.

## Related docs

- `deploy/env/.env.production.example` — 30+ production variables
- `deploy/env/BACKUP.md` — backup strategy
- `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md` — thesis runbook
