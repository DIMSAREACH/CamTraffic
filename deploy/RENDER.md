# CamTraffic on Render (Docker API)

## Web Service

| Setting | Value |
|---------|--------|
| Dockerfile | `deploy/docker/Dockerfile.backend.prod` |
| Health check path | `/health/` (or `/` after api-root) |
| Docker command | *(default from Dockerfile — uses `deploy/scripts/render_web_start.sh`)* |

On each deploy the API runs migrations and syncs **demo login accounts** (disable with `CAMTRAFFIC_SYNC_DEMO_ACCOUNTS=false`).

**Demo admin login (after redeploy):**

- Email: `admin@camtraffic.demo`
- Password: `CamTraffic@2026!`
- Portal: **admin** site (not user portal)

Custom superusers you create manually are unchanged; demo passwords are reset each deploy for the four `@camtraffic.demo` accounts only when sync is enabled.

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

## Demo login (Render Postgres)

Forgot-password email needs `RESEND_API_KEY` (or SMTP). Until then, use seeded accounts — **not** password reset.

In **camtraffic-api** → **Shell**:

```bash
python manage.py seed_demo
```

| Portal | Email | Password |
|--------|--------|----------|
| Admin | `admin@camtraffic.demo` | `CamTraffic@2026!` |
| User (officer) | `officer@camtraffic.demo` | `CamTraffic@2026!` |
| User (driver) | `driver@camtraffic.demo` | `CamTraffic@2026!` |

Pick the correct portal tab (admin vs user / officer vs driver). Wrong portal returns **401/403**, not a server bug.

## Email (password reset)

Set on the API service:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CamTraffic <noreply@your-verified-domain.com>
```

Without this, `/api/auth/password-reset/` returns **503** with a clear message (not 500).
