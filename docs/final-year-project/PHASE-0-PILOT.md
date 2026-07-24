# Phase 0 — Pilot Production Checklist

**Goal:** Run CamTraffic as a **real pilot** (1 station / few cameras), not thesis demo mode.  
**Date started:** 2026-07-23  
**Related:** `docs/PRODUCTION-RUNBOOK.md` · `infrastructure/deploy/README.md`

---

## What Phase 0 means

| Do | Do not |
|----|--------|
| `DEBUG=False`, strong secrets | Ship `CamTraffic@2026!` demo passwords |
| Officer confirms violations | Auto-create fines in public pilot |
| PostgreSQL + Redis Docker stack | Rely on SQLite for public users |
| Bootstrap real admin | Run `seed_demo` on public internet |
| Live model `best.pt` (248 classes) | Claim mAP 0.908 for 248-class without re-eval |

---

## Path note (post-restructure)

All deploy assets live under **`infrastructure/deploy/`** (not root `deploy/`).

| Old path | Current path |
|----------|----------------|
| `deploy/env/.env.production` | `infrastructure/deploy/env/.env.production` |
| `deploy/docker/docker-compose.prod.yml` | `infrastructure/deploy/docker/docker-compose.prod.yml` |
| `frontend-admin` / `frontend-user` | `src/web/admin` / `src/web/user` |
| `backend/` | `src/backend/` |

npm scripts already point at the new paths: `npm run docker:prod:up`.

---

## A — Choose your pilot host

### Option A1 — VPS (recommended for real pilot)

1. Ubuntu 22.04+ VPS (4 GB RAM minimum; 8 GB better for YOLO)
2. DNS A records → VPS IP:
   - `admin.camtraffic.store`
   - `app.camtraffic.store`
   - `api.camtraffic.store`
   - (optional) `www` / apex
3. On VPS:

```bash
sudo bash infrastructure/deploy/scripts/provision_vps_ubuntu.sh
# clone repo to /opt/camtraffic
cd /opt/camtraffic
cp infrastructure/deploy/env/.env.production.example infrastructure/deploy/env/.env.production
# edit secrets (see section B)
npm run docker:prod:up
# or: bash infrastructure/deploy/scripts/deploy_production.sh
bash infrastructure/deploy/ssl/certbot-init.sh
```

### Option A2 — Local Docker (smoke test only)

```bash
# From repo root, Docker Desktop running
npm run docker:prod:up
npm run docker:prod:ps
curl http://127.0.0.1/health/   # via nginx host port if mapped
```

TLS/DNS still required for a public pilot — local Docker is for verifying the stack builds.

### Option A3 — Windows local prod-like (no full Docker TLS)

```bash
npm run local:prod:up
```

Good for offline practice; **not** a public pilot.

### Option A4 — Render (chosen for Phase 0 public pilot)

Public hosting without managing a VPS. Create API (Docker) + two static sites + Postgres (+ Redis).  
See **Step 3** below and `infrastructure/deploy/RENDER.md`. First boot uses mock AI until weights are uploaded.

---

## B — Harden `.env.production` (required)

File: `infrastructure/deploy/env/.env.production`  
**Never commit this file.**

| Variable | Pilot value |
|----------|-------------|
| `DEBUG` | `False` |
| `SECRET_KEY` | `openssl rand -hex 32` (≥ 40 chars) |
| `DB_PASSWORD` | strong random (not `123456`) |
| `REDIS_PASSWORD` | strong random + update `REDIS_URL` |
| `ALLOW_DEMO_SEED` | `False` |
| `CAMTRAFFIC_SEED_DEMO` | `False` |
| `AI_PIPELINE_AUTO_CREATE_VIOLATION` | `False` |
| `AI_MODEL_PATH` | `/app/ai/weights/best.pt` |
| `ENABLE_API_DOCS` | `False` |
| `PAYMENT_MODE` | `khqr` or `live` (manual proof OK) |
| `USE_S3_MEDIA` | `True` if R2 configured |

Bootstrap admin (set before first deploy):

```env
CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL=ops@your-agency.gov.kh
CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD=<strong-unique>
CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME=Operations Admin
```

Generate secrets (Git Bash / WSL):

```bash
openssl rand -hex 32   # SECRET_KEY
openssl rand -hex 24   # DB_PASSWORD / REDIS_PASSWORD
```

---

## C — Deploy commands (repo root)

```bash
# 1) Ensure weights exist
ls ai/weights/best.pt

# 2) Env ready
#    infrastructure/deploy/env/.env.production edited

# 3) Build + start 8 services
npm run docker:prod:up

# 4) Status
npm run docker:prod:ps
npm run docker:prod:logs

# 5) After DNS points to VPS — TLS
bash infrastructure/deploy/ssl/certbot-init.sh
npm run docker:prod:restart
```

First admin (if bootstrap did not run):

```bash
docker compose -f infrastructure/deploy/docker/docker-compose.prod.yml \
  --env-file infrastructure/deploy/env/.env.production \
  exec backend python manage.py bootstrap_admin_env
```

Seed **violation rules only** (never demo users on public):

```bash
docker compose -f infrastructure/deploy/docker/docker-compose.prod.yml \
  --env-file infrastructure/deploy/env/.env.production \
  exec backend python manage.py seed_violation_rules
```

---

## D — Go-live verification

- [ ] `GET https://api.<domain>/health/` → 200  
- [ ] `GET https://api.<domain>/health/ready/` → 200  
- [ ] Admin login → `https://admin.<domain>/admin/dashboard`  
- [ ] Create officer + driver users (strong passwords)  
- [ ] Officer login → `/officer`  
- [ ] Driver login → `/citizen`  
- [ ] AI Detection upload (use `ai/test_samples/real/`) → officer review → fine → citizen pay (KHQR)  
- [ ] Backup once: `bash infrastructure/deploy/scripts/backup_postgres.sh`  
- [ ] Uptime monitor on `/health/ready/`

---

## E — Pilot SOP (people process)

1. **Detection** — Admin/Officer runs AI on camera or upload  
2. **Review** — Officer confirms or rejects in Detection Queue  
3. **Fine** — Officer issues fine (admins do not issue case fines)  
4. **Pay** — Driver pays KHQR + uploads proof → **Awaiting verification**  
5. **Verify** — Officer approves/rejects payment proof  
6. **Appeal** — optional; officer reviews

Keep auto-violation **off** for the whole pilot.

---

## F — Out of Phase 0 (next phases)

| Later | Why |
|-------|-----|
| Phase 1 | Retrain / evaluate with more real night-rain photos; Cambodia plate OCR |
| Phase 2 | Live RTSP cameras + GPU workers + bank payment API |
| Phase 3 | Multi-province / national scale + MoU |

---

## Status (repo prep — 2026-07-23)

- [x] Docker paths fixed for `src/backend` + `src/web/*` + `infrastructure/deploy`
- [x] `npm run docker:prod:*` points at new compose path
- [x] Example + local `.env.production`: `best.pt`, auto-violation **False**, demo seed **False**
- [x] Replace placeholder `SECRET_KEY` / `DB_PASSWORD` with openssl secrets
- [x] Bootstrap admin env set (`dimsareach009@gmail.com`)
- [x] Skip local Docker smoke (step 2) — go straight to public hosting
- [x] **Host choice: Render** (option 2) — see Step 3 below
- [x] Env prepared for bootstrap admin + Render docs
- [x] Pushed branch `restructure-project` to GitHub (secrets not committed)
- [x] Public hosting live — `api.camtraffic.store` + `app.camtraffic.store` healthy (2026-07-23)
- [ ] Fix `admin.camtraffic.store` if needed (DNS/TLS/Render custom domain)
- [ ] Login as bootstrap admin + create officers/drivers
- [ ] First end-to-end pilot case recorded (detect → approve → fine → pay)
- [ ] Optional: real YOLO weights on Render (`AI_USE_MOCK=False`)
- [ ] Optional: R2 media + Resend email + OAuth callbacks verified

---

## Step 3 — Public Render pilot (do this now)

**Chosen host:** Render (faster public URL). Full detail: `infrastructure/deploy/RENDER.md` · `infrastructure/deploy/CAMTRAFFIC-STORE.md` Option B.

**Important:** YOLO `*.pt` files are gitignored — first deploy uses **mock AI** (`AI_USE_MOCK=True`). Real YOLO later needs uploaded weights or a larger plan.

### 3.1 Prerequisites (you provide)

| Need | Notes |
|------|--------|
| [Render](https://dashboard.render.com) account | Free or paid |
| GitHub repo connected | Prefer branch Render watches (`main` or `restructure-project`) |
| Domain DNS (optional) | `camtraffic.store` for custom domains later |

### 3.2 Create managed add-ons (first)

1. **PostgreSQL** → note Internal Database URL / host, db, user, password  
2. **Redis** (Key Value) → note Internal Redis URL  

### 3.3 Create `camtraffic-api` (Web Service · Docker)

| Setting | Value |
|---------|--------|
| Repo | your CamTraffic GitHub repo |
| Branch | `restructure-project` (or `main` if merged) |
| Dockerfile path | `infrastructure/deploy/docker/Dockerfile.backend.prod` |
| Docker context | repository root (`.`) |
| Health check | `/health/` |

**Environment:** paste from `infrastructure/deploy/env/.env.render.camtraffic.store.example`, then replace:

- `SECRET_KEY` — strong random  
- `DB_*` — from Render Postgres  
- `REDIS_URL` / Celery URLs — from Render Redis  
- `CAMTRAFFIC_BOOTSTRAP_ADMIN_*` — your real admin  
- Keep **`AI_USE_MOCK=True`** + hosted-lite flags for first boot  

Start command is already in the image (`render_web_start.sh` → migrate + bootstrap + gunicorn).

### 3.4 Create static sites

**Admin** (`camtraffic-admin`):

| Setting | Value |
|---------|--------|
| Root directory | `src/web/admin` |
| Build | `npm ci && npm run build` |
| Publish | `dist` |
| Env | `VITE_API_URL=https://<your-api>.onrender.com/api` |

**User** (`camtraffic-user` — officer + citizen):

| Setting | Value |
|---------|--------|
| Root directory | `src/web/user` |
| Build | `npm ci && npm run build` |
| Publish | `dist` |
| Env | same `VITE_API_URL` as admin |

After first API URL is known, set CORS on API to include both static site URLs.

### 3.5 Smoke test (onrender.com first)

```bash
curl -fsS https://<camtraffic-api>.onrender.com/health/
curl -fsS https://<camtraffic-api>.onrender.com/health/ready/
```

Login: **Admin** → `https://<camtraffic-admin>.onrender.com`  
Use bootstrap email/password from Render env (not demo passwords on public internet).

### 3.6 Optional — custom domains

| Host | Points to |
|------|-----------|
| `api.camtraffic.store` | camtraffic-api |
| `admin.camtraffic.store` | camtraffic-admin |
| `app.camtraffic.store` | camtraffic-user |

Then update `PUBLIC_API_URL`, `CORS_*`, `VITE_API_URL`, OAuth callbacks — see `RENDER.md` §4.

### 3.7 After login

1. Create officer + driver users (strong passwords)  
2. Run one detection (mock OK) → officer review → fine → citizen pay  
3. Later: upload `best.pt` and set `AI_USE_MOCK=False` if the plan has enough RAM  

### Alternative — VPS (if you switch later)

Use Option A1 earlier in this doc + previous Step 3 VPS notes in git history / `CAMTRAFFIC-STORE.md` Option A.

---

*Phase 0 pilot checklist — CamTraffic*
