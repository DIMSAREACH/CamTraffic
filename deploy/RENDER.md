# CamTraffic on Render (Docker API)

**End-to-end checklist:** [`deploy/RENDER-COMPLETE-RUNBOOK.md`](RENDER-COMPLETE-RUNBOOK.md) (Phases 0–8, 100% demo on Render).

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

**SPA routing (`/admin/profile` 404):** Each frontend includes `public/_redirects` (copied to `dist/`) so Render serves `index.html` for client routes. After pulling latest `main`, **rebuild and redeploy** both static sites. Direct URLs like `/admin/profile` must not 404.

**Favicon:** `public/favicon.svg` + `_redirects` rule for `/favicon.ico`.

## Custom domains (`camtraffic.store` on Render)

Map your own hostnames to the three Render services. Render issues **free TLS** after DNS verifies.

### 1. Add domains in Render

| Service | Settings → Custom Domains | Hostname to add |
|---------|---------------------------|-----------------|
| **camtraffic-api** (Web, Docker) | Add Custom Domain | `api.camtraffic.store` |
| **camtraffic-admin** (Static) | Add Custom Domain | `admin.camtraffic.store` |
| **camtraffic-user** (Static) | Add Custom Domain | `app.camtraffic.store` |

Render shows a **DNS record** for each (usually **CNAME** `subdomain` → `something.onrender.com`). Copy exactly what the dashboard shows.

**Verification failed (AAAA / CAA)?** Follow **[`deploy/DNS-RENDER-VERIFY.md`](DNS-RENDER-VERIFY.md)** — delete all **AAAA** records, fix **CAA**, use **DNS only** on Cloudflare, one **CNAME** per host.

### 2. DNS at your registrar (camtraffic.store)

Create records Render asks for, typically:

| Type | Name / Host | Value (example — use Render’s value) |
|------|-------------|----------------------------------------|
| CNAME | `api` | `camtraffic-api.onrender.com` |
| CNAME | `admin` | `camtraffic-admin.onrender.com` |
| CNAME | `app` | `camtraffic-user.onrender.com` |

Wait until Render shows **Verified** (can take a few minutes up to 48h).

**Apex (`camtraffic.store`) and `www`:** Render static/API custom domains are **subdomains only**. For root/www, use your registrar’s **redirect** to `https://admin.camtraffic.store`, or Cloudflare **Redirect Rules** — do not point apex CNAME at Render unless your DNS provider supports ALIAS/ANAME to Render’s target.

### 3. Update API environment

After `api.camtraffic.store` is verified, edit **camtraffic-api → Environment**:

```env
ALLOWED_HOSTS=api.camtraffic.store,camtraffic-api.onrender.com,.onrender.com
CORS_ALLOWED_ORIGINS=https://admin.camtraffic.store,https://app.camtraffic.store
OAUTH_FRONTEND_CALLBACK_URL=https://app.camtraffic.store/auth/oauth/callback
FRONTEND_PASSWORD_RESET_URL=https://app.camtraffic.store/reset-password
```

Remove old-only origins if you no longer use `*.onrender.com` URLs in the browser:

```env
# remove or replace:
# CORS_ALLOWED_ORIGINS=https://camtraffic-admin.onrender.com,...
```

**Save → Redeploy** the API.

Full template: `deploy/env/.env.render.camtraffic.store.example`

### 4. Rebuild static sites (critical)

Custom domains do **not** change the baked-in API URL. Set **Environment** on **each** static site:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://api.camtraffic.store/api` |

Trigger **Manual Deploy** on admin and user static sites.

### 5. Verify

```text
https://api.camtraffic.store/health/
https://admin.camtraffic.store/     → admin login
https://app.camtraffic.store/       → user portal
```

Login still uses **admin** hostname for administrators (`admin@camtraffic.demo` / `CamTraffic@2026!` or bootstrap env).

More (Resend, OAuth consoles): [`deploy/CAMTRAFFIC-STORE.md`](CAMTRAFFIC-STORE.md)

### Troubleshooting: `net::ERR_NAME_NOT_RESOLVED` for `api.camtraffic.store`

The browser cannot resolve the hostname — **DNS is missing or not propagated yet**. This is not fixed in application code.

**Works immediately (until DNS is ready):** On **camtraffic-admin** and **camtraffic-user** static sites, set:

```env
VITE_API_URL=https://camtraffic-api.onrender.com/api
```

Manual Deploy both sites. Keep using `https://camtraffic-admin.onrender.com` in the browser (or your admin custom domain only after *that* DNS record exists too).

**Permanent fix (custom API hostname):**

1. **camtraffic-api → Settings → Custom Domains →** add `api.camtraffic.store`. Copy Render’s **CNAME target** (e.g. `camtraffic-api.onrender.com`).
2. At your **domain registrar** (where you bought `camtraffic.store`), add:

   | Type | Host / name | Value |
   |------|-------------|--------|
   | CNAME | `api` | *(exact target from Render)* |

3. Wait until Render shows the domain **Verified** (often 5–30 minutes; up to 48h).
4. Test: `nslookup api.camtraffic.store` or open `https://api.camtraffic.store/health/` in a browser.
5. Then set `VITE_API_URL=https://api.camtraffic.store/api` and redeploy admin + user static sites.

Do **not** point frontends at `api.camtraffic.store` until step 4 succeeds.

**Render says it couldn’t verify (AAAA / CAA):** see **[`deploy/DNS-RENDER-VERIFY.md`](DNS-RENDER-VERIFY.md)**.

## Environment

Use internal Postgres host and Redis URL from Render dashboards. Set `ALLOWED_HOSTS` to your `*.onrender.com` hostname and `CORS_ALLOWED_ORIGINS` to your static site URLs.

**CORS / login blocked from admin or user static site:** On the API service set:

```env
CORS_ALLOWED_ORIGINS=https://camtraffic-admin.onrender.com,https://camtraffic-user.onrender.com
```

Production also allows `https://*.onrender.com` and `https://*.camtraffic.store` via regex (disable with `CORS_ALLOW_RENDER_ORIGINS=false`). Redeploy API after env changes.

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

## AI detect returns **500** on Render

Hosted instances are memory-limited and **do not ship YOLO weights** in Git. Set on **camtraffic-api**:

```env
AI_USE_MOCK=True
AI_WARMUP_MODELS=False
AI_VEHICLE_ENABLED=False
AI_PLATE_OCR_ENABLED=False
```

- **Mock** uses filename/hash heuristics (good for demo uploads with sign-related filenames).
- **Vehicle / plate OCR** pull large models (YOLO download + EasyOCR) and often OOM on free/small plans.

Redeploy the API after changing env. For real YOLO on a VPS, use `npm run docker:prod:up` with `ai/weights/best_v2.pt` on disk and `AI_USE_MOCK=False`.

**Settings `/api/settings/*_config/` 404:** fixed in API — missing keys return **200** with empty `{}`. Redeploy API.

**Images 404 (`/media/...` or filename on admin domain):** set `PUBLIC_API_URL=https://api.camtraffic.store`, `SERVE_MEDIA=True` on API, and rebuild admin/user with `VITE_API_URL=https://api.camtraffic.store/api`.

## Email (password reset)

Set on the API service:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CamTraffic <noreply@your-verified-domain.com>
```

Without this, `/api/auth/password-reset/` returns **503** with a clear message (not 500).

Full variable list (placeholders): `deploy/env/.env.render.example`

**Custom domain (camtraffic.store):** [`deploy/CAMTRAFFIC-STORE.md`](CAMTRAFFIC-STORE.md) and `deploy/env/.env.render.camtraffic.store.example`
