# CamTraffic — Production Deployment

**Phase 13 / Phase 0 pilot** · Folder: `infrastructure/deploy/`

## Stack (8 services)

| Service | Image / Dockerfile | Role |
|---------|-------------------|------|
| `postgres` | postgres:16-alpine | Primary database |
| `redis` | redis:7-alpine | Cache + Celery broker (AOF) |
| `backend` | `docker/Dockerfile.backend.prod` | Django + Gunicorn + YOLO |
| `celery-worker` | shared app image | Reports, notifications |
| `celery-beat` | shared app image | Scheduled tasks |
| `ai-worker` | shared app image | AI ingest queue |
| `nginx` | `docker/Dockerfile.nginx.prod` | TLS, 4 vhosts, static SPAs |
| `certbot` | certbot/certbot (profile `ssl`) | Certificate renewal |

## Quick start

From the **repo root**:

```bash
npm run docker:prod:up
```

Auto-creates `infrastructure/deploy/env/.env.production` from the example on first run.

Or manually:

```bash
cp infrastructure/deploy/env/.env.production.example infrastructure/deploy/env/.env.production
bash infrastructure/deploy/scripts/deploy_production.sh
```

Pilot checklist: [`docs/final-year-project/PHASE-0-PILOT.md`](../../docs/final-year-project/PHASE-0-PILOT.md).

## npm scripts

| Script | Action |
|--------|--------|
| `npm run docker:prod:up` | Build + start stack |
| `npm run docker:prod:down` | Stop stack |
| `npm run docker:prod:logs` | Follow logs |
| `npm run docker:prod:restart` | Restart nginx |
| `npm run docker:prod:ps` | Container status |

## VPS provisioning

```bash
sudo bash infrastructure/deploy/scripts/provision_vps_ubuntu.sh
git clone https://github.com/SareachGenZ/CamTraffic.git /opt/camtraffic
cd /opt/camtraffic && bash infrastructure/deploy/scripts/deploy_production.sh
```

## SSL + DNS

1. Point DNS A-records (see `ssl/README.md`)
2. `bash infrastructure/deploy/ssl/certbot-init.sh`
3. `npm run docker:prod:restart`

## Backups

```bash
bash infrastructure/deploy/scripts/backup_postgres.sh
bash infrastructure/deploy/scripts/install_backup_cron.sh
```

See [`env/BACKUP.md`](env/BACKUP.md).

## Related docs

- [`docs/PRODUCTION-RUNBOOK.md`](../../docs/PRODUCTION-RUNBOOK.md)
- [`docs/final-year-project/PHASE-0-PILOT.md`](../../docs/final-year-project/PHASE-0-PILOT.md)
- [`CAMTRAFFIC-STORE.md`](CAMTRAFFIC-STORE.md)
