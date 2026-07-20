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

## Static sites (admin + user)

| Setting | Admin | User |
|---------|--------|------|
| Build command | `npm ci && npm run build --prefix frontend-admin` | `npm ci && npm run build --prefix frontend-user` |
| Publish directory | `frontend-admin/dist` | `frontend-user/dist` |
| Build env | `VITE_API_URL=https://camtraffic-api.onrender.com/api` | same |

Requires `frontend-*/shared/vite/build.ts` in Git (used by `vite.config.ts`).

## Environment

Use internal Postgres host and Redis URL from Render dashboards. Set `ALLOWED_HOSTS` to your `*.onrender.com` hostname and `CORS_ALLOWED_ORIGINS` to your static site URLs.

Do not commit `deploy/env/.env.production` or paste database passwords in chat.
