# Host CamTraffic on Render (post-restructure)

**Repo:** `https://github.com/DIMSAREACH/CamTraffic`  
**Branch:** prefer `main` or the branch Render watches (e.g. `restructure-project` until merged).

---

## Services to create

| Render service | Type | Role |
|----------------|------|------|
| `camtraffic-api` | Web Service (Docker) | Django API |
| `camtraffic-admin` | Static Site | Admin SPA |
| `camtraffic-user` | Static Site | Officer + Citizen SPA |
| PostgreSQL | Managed DB | Required |
| Redis | Managed Key Value | Recommended for cache/Celery |

---

## 1. API (Docker)

- **Dockerfile path:** `infrastructure/deploy/docker/Dockerfile.backend.prod`  
  (or `infra/docker/Dockerfile.backend` for a lighter image)
- **Docker context:** repository root
- **Health check path:** `/health/`

Paste env from `infrastructure/deploy/env/.env.render.camtraffic.store.example`  
(or `.env.render.example` without custom domains).

**Must set on Render (dashboard secrets):**

```
SECRET_KEY=
DB_*  (from Render Postgres)
REDIS_URL=
CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL=
CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD=
CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME=
RESEND_API_KEY=
GOOGLE_OAUTH_* / GITHUB_OAUTH_*
USE_S3_MEDIA=True + AWS_* (R2)   # Render disk is ephemeral
AI_MODEL_PATH=/app/ai/weights/best.pt
AI_PIPELINE_AUTO_CREATE_VIOLATION=False
ALLOW_DEMO_SEED=False
```

**Note:** YOLO weights (`*.pt`) are gitignored. Upload weights via Render disk/S3 or bake into a private image; otherwise set `AI_USE_MOCK=True` for API-only smoke tests.

After first deploy, bootstrap runs via `render_web_start.sh` / release command:

```
python manage.py migrate --noinput && python manage.py bootstrap_admin_env
```

---

## 2. Admin static site

- **Root directory:** `src/web/admin`
- **Build:** `npm ci && npm run build`
- **Publish:** `dist`
- **Env:** `VITE_API_URL=https://api.camtraffic.store/api`  
  (or `https://camtraffic-api.onrender.com/api`)

---

## 3. User static site (officer + citizen)

- **Root directory:** `src/web/user`
- **Build:** `npm ci && npm run build`
- **Publish:** `dist`
- **Env:** same `VITE_API_URL` as admin

---

## 4. Custom domains (optional)

| Host | Points to |
|------|-----------|
| `api.camtraffic.store` | camtraffic-api |
| `admin.camtraffic.store` | camtraffic-admin |
| `app.camtraffic.store` | camtraffic-user |

Then set:

```
PUBLIC_API_URL=https://api.camtraffic.store
CORS_ALLOWED_ORIGINS=https://admin.camtraffic.store,https://app.camtraffic.store
OAUTH_FRONTEND_CALLBACK_URL=https://app.camtraffic.store/auth/oauth/callback
FRONTEND_PASSWORD_RESET_URL=https://app.camtraffic.store/reset-password
```

Add the same OAuth redirect URI in Google/GitHub consoles.

---

## 5. Smoke test

```bash
curl -fsS https://api.camtraffic.store/health/
# or https://camtraffic-api.onrender.com/health/
```

Login admin portal with your bootstrap email.

---

## Related

- `infrastructure/deploy/CAMTRAFFIC-STORE.md`
- `infrastructure/deploy/env/.env.render.camtraffic.store.example`
- `docs/final-year-project/PHASE-0-PILOT.md`
