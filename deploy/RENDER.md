# CamTraffic on Render (Docker API)

## Web Service

| Setting | Value |
|---------|--------|
| Dockerfile | `deploy/docker/Dockerfile.backend.prod` |
| Health check path | `/health/` (or `/` after api-root) |
| Docker command | `sh -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn -c /app/deploy/gunicorn/gunicorn.conf.py camtraffic.wsgi:application"` |

## URLs

- Root: `GET /` — service info (for default probes)
- Liveness: `GET /health/`
- Readiness (DB): `GET /health/ready/`
- API: `https://<service>.onrender.com/api/`

## Environment

Use internal Postgres host and Redis URL from Render dashboards. Set `ALLOWED_HOSTS` to your `*.onrender.com` hostname and `CORS_ALLOWED_ORIGINS` to your static site URLs.

Do not commit `deploy/env/.env.production` or paste database passwords in chat.
