# CamTraffic on Render (Docker API)

## Web Service

| Setting | Value |
|---------|--------|
| Dockerfile | `deploy/docker/Dockerfile.backend.prod` |
| Health check path | `/health/` (or `/` after api-root) |
| Docker command | *(default from Dockerfile — uses `deploy/scripts/render_web_start.sh`)* |

Gunicorn listens on Render’s **`PORT`** (set automatically). Do not hard-code `GUNICORN_BIND=0.0.0.0:8000` only — the image reads `PORT` when present.

If deploy exits immediately (e.g. status **128**), check **Logs** for `bad interpreter` on the start script (Windows CRLF). Shell scripts in Git must use LF (see repo `.gitattributes`).

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

## Your own admin (no Render Shell)

On each deploy, the API can create/update **your** admin from environment variables.

**camtraffic-api → Environment → Add:**

| Key | Value |
|-----|--------|
| `CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL` | your email, e.g. `you@gmail.com` |
| `CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD` | your strong password |
| `CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME` | optional display name, e.g. `Dimsa Reach` |

Save → **Redeploy**. On startup the API runs `bootstrap_admin_env` (password is updated every deploy if these vars are set).

Sign in on the **admin** static site with that email and password.

**Or use demo admin** (no extra env; synced each deploy):

| Email | Password |
|--------|----------|
| `admin@camtraffic.demo` | `CamTraffic@2026!` |

## Demo login (all accounts)

Forgot-password email needs `RESEND_API_KEY` (or SMTP). Until then, use seeded accounts — **not** password reset.

Demo accounts are synced automatically on deploy (`seed_demo --accounts-only`). Shell is optional:

```bash
python manage.py seed_demo
```

## Email (password reset)

Set on the API service:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CamTraffic <noreply@your-verified-domain.com>
```

Without this, `/api/auth/password-reset/` returns **503** with a clear message (not 500).

Full variable list (placeholders): `deploy/env/.env.render.example`
