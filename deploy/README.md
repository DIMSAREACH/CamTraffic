# CamTraffic Deployment

Production deployment and DevOps (Phase 9 — Tasks **121–128**).

## Quick reference

| Task | Area | Path |
|------|------|------|
| 121 | Production Docker | `deploy/docker/` |
| 122 | Nginx | `deploy/nginx/` |
| 123 | Gunicorn | `deploy/gunicorn/` |
| 124 | Celery workers | `deploy/celery/` |
| 125 | CI/CD | `.github/workflows/ci.yml` |
| 126 | Production env | `deploy/env/.env.production.example` |
| 127 | SSL / HTTPS | `deploy/ssl/` |
| 128 | This guide | `deploy/README.md` |

## Development (Task 002)

```bash
cp .env.example .env
npm run docker:up
```

See [docker/README.md](./docker/README.md).

## Production deployment

### 1. Prepare environment (Task 126)

```bash
cp deploy/env/.env.production.example .env.production
# Edit secrets: DJANGO_SECRET_KEY, POSTGRES_PASSWORD, email SMTP, domains
openssl rand -hex 32   # generate DJANGO_SECRET_KEY
```

### 2. Build and start stack (Task 121)

```bash
npm run docker:prod:up
```

Services:

| Service | Internal host | Public URL (example) |
|---------|---------------|----------------------|
| Nginx | `nginx:80` | `https://admin.camtraffic.kh`, `https://app.camtraffic.kh` |
| Backend (Gunicorn) | `backend:8000` | `https://api.camtraffic.kh` |
| AI service | `ai-service:8001` | `https://ai.camtraffic.kh` |
| Celery worker | — | background jobs |
| Celery beat | — | scheduled tasks |
| PostgreSQL | `postgres:5432` | internal only |
| Redis | `redis:6379` | internal only |

### 3. Gunicorn (Task 123)

Configured in `deploy/gunicorn/gunicorn.conf.py` and baked into `Dockerfile.backend.prod`.

Tune via `.env.production`:

```env
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=120
```

### 4. Nginx (Task 122)

- `deploy/nginx/nginx.conf` — global settings
- `deploy/nginx/camtraffic.conf` — virtual hosts for admin, app, API, AI
- `deploy/docker/Dockerfile.nginx.prod` — builds frontends and serves static assets

### 5. Celery (Task 124)

- Django Celery app: `backend/config/celery.py`
- Sample task: `backend/apps/core/tasks.py` (`core.ping`)
- Worker image: `deploy/celery/Dockerfile.worker`
- Started automatically in `docker-compose.prod.yml` as `celery-worker` and `celery-beat`

### 6. SSL / HTTPS (Task 127)

HTTP is enabled by default. For TLS:

```bash
# Issue certificates (requires DNS pointing to the server)
sh deploy/ssl/certbot-init.sh camtraffic.kh admin@camtraffic.kh

# Enable HTTPS server blocks in deploy/nginx/camtraffic.conf
# Mount certs from the certbot volume (already wired in compose)

# Optional auto-renew profile
docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production --profile ssl up -d certbot
```

See [ssl/README.md](./ssl/README.md).

### 7. CI/CD (Task 125)

GitHub Actions workflow: `.github/workflows/ci.yml`

On every push/PR to `main`, `master`, or `develop`:

1. Build shared packages
2. Run `validate:all`
3. Run backend + frontend tests
4. Typecheck frontends
5. Build production Docker images

Reference copy: `deploy/cicd/github-actions-ci.yml`

## NPM scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Development compose |
| `npm run docker:prod:up` | Production compose (detached) |
| `npm run docker:prod:down` | Stop production stack |
| `npm run docker:prod:logs` | Tail production logs |

## Architecture

```text
                    ┌─────────────┐
   Internet ───────►│    Nginx    │
                    │  :80 / :443 │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    /var/www/admin   /var/www/user    proxy /api
           │               │               │
           │               │         ┌─────▼─────┐
           │               │         │  Gunicorn │
           │               │         │  backend  │
           │               │         └─────┬─────┘
           │               │               │
           │               │         ┌─────▼─────┐
           │               └────────►│ PostgreSQL│
           │                         └───────────┘
           │                         ┌───────────┐
           └────────────────────────►│   Redis   │◄── Celery worker/beat
                                     └───────────┘
                                           ▲
                                     ┌─────┴─────┐
                                     │ AI service│
                                     └───────────┘
```

## Troubleshooting

### Backend health check fails

```bash
npm run docker:prod:logs
docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production ps
```

Verify `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY` in `.env.production`.

### Frontend shows wrong API URL

Rebuild nginx with correct build args — set `VITE_API_URL` and `VITE_AI_SERVICE_URL` in `.env.production` before `docker:prod:up`.

### Reset production data

```bash
npm run docker:prod:down
docker volume rm camtraffic-prod_postgres_data camtraffic-prod_redis_data
npm run docker:prod:up
```

## Status

Phase 9 complete — all deployment artifacts are in place for production rollout.
