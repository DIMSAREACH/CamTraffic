# CamTraffic — Production Runbook (Real-World Deploy)

**Audience:** operators deploying the multi-domain enforcement system (Admin / Officer / Citizen).  
**Stack:** Docker Compose 8 services · Nginx TLS · Django · PostgreSQL · Redis · Celery · embedded YOLO.  
**Paths:** use `infrastructure/deploy/` (see `docs/final-year-project/PHASE-0-PILOT.md`).

---

## 1. Pre-flight (P0)

| Check | Requirement |
|-------|-------------|
| Secrets | `SECRET_KEY` ≥ 40 chars; strong `DB_PASSWORD` (never `123456`) |
| Debug | `DEBUG=False` |
| Demo seed | `ALLOW_DEMO_SEED=False`, `CAMTRAFFIC_SEED_DEMO=False` |
| AI auto-fine | `AI_PIPELINE_AUTO_CREATE_VIOLATION=False` (officer reviews cases) |
| Domains | DNS A records for `admin.`, `app.`, `api.` |
| Weights | `ai/weights/best.pt` present on host / volume (248-class live) |
| TLS email | `CERTBOT_EMAIL` set |

Copy env:

```bash
cp infrastructure/deploy/env/.env.production.example infrastructure/deploy/env/.env.production
# edit secrets — openssl rand -hex 32
```

---

## 2. Deploy

```bash
npm run docker:prod:up
# or: bash infrastructure/deploy/scripts/deploy_production.sh
# First time HTTPS:
bash infrastructure/deploy/ssl/certbot-init.sh
```

Portals after DNS + TLS:

| Domain | URL | Routes |
|--------|-----|--------|
| Administration | `https://admin.<domain>` | `/admin/*` |
| Traffic Ops + Citizen | `https://app.<domain>` | `/officer/*`, `/citizen/*` |
| API | `https://api.<domain>` | `/api/`, `/api/v1/` |

---

## 3. First admin (no demo passwords)

```bash
# In .env.production:
CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL=ops@agency.gov.kh
CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD=<strong>
CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME=Operations Admin

docker compose -f infrastructure/deploy/docker/docker-compose.prod.yml \
  --env-file infrastructure/deploy/env/.env.production \
  exec backend python manage.py bootstrap_admin_env
```

Create officers/drivers from Admin → Users (never ship `CamTraffic@2026!` to public users).

---

## 4. Health

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `/health/` | public | Liveness |
| `/health/ready/` | public | DB + Redis readiness |
| `/health/status/` | officer/admin JWT | Ops metrics (not public) |

```bash
curl -fsS https://api.<domain>/health/
curl -fsS https://api.<domain>/health/ready/
```

---

## 5. Backup & restore

See `infrastructure/deploy/env/BACKUP.md`.

```bash
bash infrastructure/deploy/scripts/backup_postgres.sh
bash infrastructure/deploy/scripts/restore_postgres.sh backend/backups/pg-backup-….sql.gz
```

---

## 6. Live payments (Stripe + ABA KHQR)

Set in `.env.production` (`PAYMENT_MODE=live` recommended):

| Provider | Required | Notes |
|----------|----------|-------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Webhook URL: `https://api.<domain>/api/fines/stripe/webhook/` |
| ABA KHQR | `KHQR_MERCHANT_NAME`, `KHQR_MERCHANT_ACCOUNT` | QR at `src/web/user/public/payments/aba-khqr.png` |
| Manual | `PAYMENT_MANUAL_PROOF_ENABLED=True` | Proof upload still available |

---

## 7. Security baseline

- HTTPS + HSTS
- Only **officers** issue fines / approve violations
- API docs off (`ENABLE_API_DOCS=False`)
- Redis password recommended

---

## 8. What is NOT production

| Item | Status |
|------|--------|
| `seed_demo` / `@camtraffic.demo` | Dev & thesis defense only |
| Next.js `apps/citizen` | Prototype — use `src/web/user` `/citizen/*` |

---

## 9. Go-live checklist

- [ ] `.env.production` filled; not committed to git  
- [ ] `DEBUG=False`, demo seed flags false  
- [ ] TLS certificates issued  
- [ ] Bootstrap admin login works  
- [ ] Officer → `/officer`; citizen → `/citizen`  
- [ ] Detection + officer approve + citizen fine view  
- [ ] Backup cron + restore drill once  
- [ ] Uptime monitor on `/health/ready/`  

Full pilot steps: **`docs/final-year-project/PHASE-0-PILOT.md`**.

---

## Related docs

- `infrastructure/deploy/README.md`
- `docs/final-year-project/PHASE-0-PILOT.md`
- `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md`
