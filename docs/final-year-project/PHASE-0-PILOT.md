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
- [x] Env prepared for bootstrap admin + Render docs
- [x] Pushed branch `restructure-project` to GitHub (secrets not committed)
- [ ] Configure Render services (API + admin + user) per `infrastructure/deploy/RENDER.md`
- [ ] Set Render env secrets (DB, Redis, bootstrap admin, R2)
- [ ] Upload/mount YOLO weights or temporary `AI_USE_MOCK=True`
- [ ] Custom domains / OAuth callbacks
- [ ] Login as Dim Sareach + create officers/drivers
- [ ] First end-to-end pilot case recorded

---

## Step 3 — Public VPS pilot (do this now)

You skipped local Docker. Work in this order:

### 3.1 Prerequisites (you provide)

| Need | Example |
|------|---------|
| Ubuntu VPS | 4–8 GB RAM, Docker-capable |
| Public IPv4 | e.g. `203.0.113.10` |
| Domain DNS access | `camtraffic.store` registrar |

### 3.2 DNS (at registrar)

Point **A records** to your VPS IP:

```
camtraffic.store       →  VPS_IP
www.camtraffic.store   →  VPS_IP
admin.camtraffic.store →  VPS_IP
app.camtraffic.store   →  VPS_IP
api.camtraffic.store   →  VPS_IP
```

Also in Google OAuth console, add redirect URI:  
`https://app.camtraffic.store/auth/oauth/callback`

### 3.3 On the VPS (SSH)

```bash
# As root — install Docker + firewall
sudo bash infrastructure/deploy/scripts/provision_vps_ubuntu.sh
# (or after clone — see below)

git clone https://github.com/SareachGenZ/CamTraffic.git /opt/camtraffic
cd /opt/camtraffic

# Copy your prepared env from laptop (do NOT commit it)
# From your Windows machine (example with scp):
#   scp infrastructure/deploy/env/.env.production user@VPS_IP:/opt/camtraffic/infrastructure/deploy/env/.env.production

# Ensure YOLO weights exist (large — scp or git-lfs)
#   scp ai/weights/best.pt user@VPS_IP:/opt/camtraffic/ai/weights/best.pt

# Install Node if using npm scripts (or use bash deploy script)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

npm run docker:prod:up

# After DNS has propagated:
bash infrastructure/deploy/ssl/certbot-init.sh
npm run docker:prod:restart
```

### 3.4 Smoke test

```bash
curl -fsS https://api.camtraffic.store/health/
curl -o /dev/null -w "%{http_code}\n" https://admin.camtraffic.store/
curl -o /dev/null -w "%{http_code}\n" https://app.camtraffic.store/
```

Login: **Admin** → `https://admin.camtraffic.store`  
Email: `dimsareach009@gmail.com` (password from your `.env.production`)

### 3.5 After login

1. Create officer + driver users (strong passwords)  
2. Run one detection → officer review → fine → citizen pay  

---

*Phase 0 pilot checklist — CamTraffic*
