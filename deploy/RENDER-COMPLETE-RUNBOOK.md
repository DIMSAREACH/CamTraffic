# CamTraffic — complete Render hosting (step-by-step)

Goal: **API + admin + user** working on Render (login, dashboard, AI detect demo, settings, media).  
Repo: `https://github.com/DIMSAREACH/CamTraffic` · branch **`main`**.

**What Render runs well:** Docker API, Postgres, Redis, two static SPAs.  
**Limits on small plans:** real YOLO/EasyOCR (use **mock AI**); Celery workers need extra Background Worker services (optional).

---

## Phase 0 — Prerequisites

1. [Render](https://render.com) account (GitHub linked).
2. GitHub repo connected (auto-deploy from `main`).
3. Optional later: domain **camtraffic.store** at your registrar ([DNS guide](DNS-RENDER-VERIFY.md)).

---

## Phase 1 — Create backing services

### 1.1 PostgreSQL

1. **New → PostgreSQL** → name e.g. `camtraffic-db` → region same as other services.
2. After create, copy **Internal Database URL** fields: host, database, user, password, port.

### 1.2 Redis (Key Value)

1. **New → Key Value** (Redis) → name e.g. `camtraffic-redis`.
2. Copy **Internal Redis URL** (starts with `redis://`).

---

## Phase 2 — API (Docker web service)

### 2.1 Create service

| Field | Value |
|--------|--------|
| Type | **Web Service** |
| Name | `camtraffic-api` |
| Runtime | **Docker** |
| Repo | CamTraffic |
| Branch | `main` |
| Root directory | *(empty — repo root)* |
| Dockerfile | `deploy/docker/Dockerfile.backend.prod` |
| Docker command | **leave empty** (uses `render_web_start.sh`) |
| Health check path | `/health/` |
| Instance | Free or Starter (Starter recommended for AI/mock) |

Link **Postgres** and **Redis** in the service’s **Connections** (or paste internal URLs in env).

### 2.2 Environment variables

Copy from [`deploy/env/.env.render.example`](env/.env.render.example). Replace every `REPLACE_*`:

| Variable | Where to get it |
|----------|-----------------|
| `SECRET_KEY` | Random 50+ chars (`openssl rand -hex 32`) |
| `DB_*` | Postgres internal credentials |
| `REDIS_URL` | Redis URL ending `/0` |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Same Redis host, `/1` |
| `ALLOWED_HOSTS` | `camtraffic-api.onrender.com,.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | Your admin + user **browser URLs** (see below) |
| `PUBLIC_API_URL` | `https://camtraffic-api.onrender.com` |
| `RESEND_API_KEY` | Resend dashboard (optional until password reset) |

**Required for stable hosted AI (mock demo):**

```env
AI_USE_MOCK=True
AI_WARMUP_MODELS=False
AI_VEHICLE_ENABLED=False
AI_PLATE_OCR_ENABLED=False
SERVE_MEDIA=True
CAMTRAFFIC_SYNC_DEMO_ACCOUNTS=true
```

**Your own admin (no Shell):**

```env
CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL=you@gmail.com
CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD=YourStr0ng!Pass
CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME=Your Name
```

Do **not** set `GUNICORN_BIND=0.0.0.0:8000` only — the image uses Render’s `PORT`.

### 2.3 Deploy and verify API

1. **Deploy** → wait until **Live**.
2. Open:
   - `https://camtraffic-api.onrender.com/health/` → OK JSON
   - `https://camtraffic-api.onrender.com/health/ready/` → database OK
3. Logs should show: `migrate`, `collectstatic`, `seed_demo`, `bootstrap_admin_env`, Gunicorn.

---

## Phase 3 — Admin static site

### 3.1 Create service

| Field | Value |
|--------|--------|
| Type | **Static Site** |
| Name | `camtraffic-admin` |
| Build command | `npm ci && npm run build --prefix frontend-admin` |
| Publish directory | `frontend-admin/dist` |

### 3.2 Build environment

```env
VITE_API_URL=https://camtraffic-api.onrender.com/api
VITE_USE_MOCK=false
```

(Use `https://api.camtraffic.store/api` only after custom domain DNS works.)

### 3.3 Deploy

1. **Manual Deploy** after each env or Git change.
2. Confirm `dist/_redirects` exists in build (SPA routes like `/admin/profile`).

### 3.4 Verify admin

1. Open `https://camtraffic-admin.onrender.com`
2. Login **admin portal**:
   - Demo: `admin@camtraffic.demo` / `CamTraffic@2026!`
   - Or bootstrap email/password from env
3. Dashboard loads (no CORS errors in browser console).

---

## Phase 4 — User static site

Same as Phase 3, but:

| Field | Value |
|--------|--------|
| Name | `camtraffic-user` |
| Build | `npm ci && npm run build --prefix frontend-user` |
| Publish | `frontend-user/dist` |
| `VITE_API_URL` | same as admin |

Verify: `https://camtraffic-user.onrender.com` → login `officer@camtraffic.demo` or `driver@camtraffic.demo` / `CamTraffic@2026!`.

Update API if needed:

```env
CORS_ALLOWED_ORIGINS=https://camtraffic-admin.onrender.com,https://camtraffic-user.onrender.com
OAUTH_FRONTEND_CALLBACK_URL=https://camtraffic-user.onrender.com/auth/oauth/callback
FRONTEND_PASSWORD_RESET_URL=https://camtraffic-user.onrender.com/reset-password
```

Redeploy **API** after CORS changes.

---

## Phase 5 — Full functional checklist (~100% on Render)

Do these in order after all three services are live.

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Admin login | JWT returned, dashboard visible |
| 2 | User login | Officer/driver tabs work |
| 3 | Settings page | `/admin/settings` — no 404 on `/api/settings/*` (200 + `{}` ok) |
| 4 | Direct URL | `/admin/profile` loads (not static 404) |
| 5 | AI detect | Upload image on **AI Detection** — **503/mock OK**, not endless 500 |
| 6 | Detection image | After detect, image URL is `https://camtraffic-api.onrender.com/media/...` |
| 7 | Cameras / lists | Pages load data or empty state (not network error) |
| 8 | API health | `/health/ready/` OK after cold start |

**Demo AI tip:** rename upload to include sign hint (e.g. `NO_ENTRY_sample.jpg`) for better mock results.

---

## Phase 6 — Custom domain (optional)

Only after **onrender.com** stack works.

1. Add custom domains in Render (api, admin, app) — [RENDER.md § Custom domains](RENDER.md).
2. DNS CNAMEs at registrar — [DNS-RENDER-VERIFY.md](DNS-RENDER-VERIFY.md).
3. Update API: `ALLOWED_HOSTS`, `CORS`, `PUBLIC_API_URL=https://api.camtraffic.store`.
4. Rebuild **both** static sites with matching `VITE_API_URL`.
5. Verify each hostname (no `ERR_NAME_NOT_RESOLVED`).

**Hobby plan:** only **2** custom domains included — prioritize **api** + **admin**, or upgrade.

---

## Phase 7 — Email (optional)

On **camtraffic-api**:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CamTraffic <noreply@your-verified-domain.com>
DEFAULT_FROM_EMAIL=CamTraffic <noreply@your-verified-domain.com>
```

Verify domain in Resend. Password reset returns **200**, not **503**.

---

## Phase 8 — What is *not* 100% on default Render

| Feature | On Render default | Full production |
|---------|-------------------|-----------------|
| Real YOLO weights | Mock / heuristics | VPS Docker + `ai/weights/best_v2.pt` |
| Celery reports/queues | Not running | Add Background Workers (same Docker image) |
| Media persistence | Ephemeral disk | S3 or VPS volume |
| 3+ custom domains | Plan limit | Pro plan or 2 domains + onrender URLs |

For thesis **defense demo**, Phases 1–5 + demo accounts are usually enough.

---

## Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| Deploy exit 128 | Empty Docker command; latest `main`; check logs for migrate |
| Login CORS | `CORS_ALLOWED_ORIGINS` = exact admin/user origins; redeploy API |
| `api.camtraffic.store` NXDOMAIN | DNS not ready — use `camtraffic-api.onrender.com` in `VITE_API_URL` |
| `/admin/profile` 404 | Redeploy admin after `_redirects` in repo |
| AI detect 500 | `AI_USE_MOCK=True`, disable vehicle/OCR; redeploy API |
| Media 404 | `SERVE_MEDIA=True`, `PUBLIC_API_URL`, redeploy API + frontends |

---

## Service map (onrender.com)

| Service | URL |
|---------|-----|
| API | `https://camtraffic-api.onrender.com` |
| Admin | `https://camtraffic-admin.onrender.com` |
| User | `https://camtraffic-user.onrender.com` |

Templates: [`deploy/env/.env.render.example`](env/.env.render.example) · [`deploy/env/.env.render.camtraffic.store.example`](env/.env.render.camtraffic.store.example)
