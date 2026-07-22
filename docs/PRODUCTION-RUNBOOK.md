# CamTraffic — Production Runbook (Real-World Deploy)

**Audience:** operators deploying the multi-domain enforcement system (Admin / Officer / Citizen).  
**Stack:** Docker Compose 8 services · Nginx TLS · Django · PostgreSQL · Redis · Celery · embedded YOLO.

---

## 1. Pre-flight (P0)

| Check | Requirement |
|-------|-------------|
| Secrets | `SECRET_KEY` ≥ 40 chars; strong `DB_PASSWORD` (never `123456`) |
| Debug | `DEBUG=False` |
| Demo seed | `ALLOW_DEMO_SEED=False`, `CAMTRAFFIC_SEED_DEMO=False` |
| AI auto-fine | `AI_PIPELINE_AUTO_CREATE_VIOLATION=False` (officer reviews cases) |
| Domains | DNS A records for `admin.`, `app.`, `api.` |
| Weights | `ai/weights/best_v2.pt` present on host / volume |
| TLS email | `CERTBOT_EMAIL` set |

Copy env:

```bash
cp deploy/env/.env.production.example deploy/env/.env.production
# edit secrets — openssl rand -hex 32
```

---

## 2. Deploy

```bash
./deploy/scripts/deploy_production.sh
# First time HTTPS:
./deploy/ssl/certbot-init.sh
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

docker compose -f deploy/docker/docker-compose.prod.yml exec backend \
  python manage.py bootstrap_admin_env
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

See `deploy/env/BACKUP.md`.

```bash
./deploy/scripts/backup_postgres.sh
./deploy/scripts/restore_postgres.sh backend/backups/pg-backup-….sql.gz
```

---

## 6. Live payments (Stripe + ABA KHQR)

Set in `.env.production` (`PAYMENT_MODE=live` recommended):

| Provider | Required | Notes |
|----------|----------|-------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Webhook URL: `https://api.<domain>/api/fines/stripe/webhook/` · event `checkout.session.completed` |
| ABA KHQR | `KHQR_MERCHANT_NAME`, `KHQR_MERCHANT_ACCOUNT` (+ optional KHR) | Static QR at `frontend-user/public/payments/aba-khqr.png`; citizen confirms with bill reference |
| Manual | `PAYMENT_MANUAL_PROOF_ENABLED=True` | Bank-transfer proof upload still available |

Citizen return URLs must use `/citizen/fines` (already in `.env.production.example`).

Verify: citizen pays a test fine → status becomes **paid** (Stripe webhook or KHQR confirm).

See also `docs/PAYMENTS-DATA-OCR-COMPLETION.md`.

---

## 7. Security baseline

- HTTPS + HSTS (`SECURE_HSTS_SECONDS`, nginx `ssl-params.conf`)
- Only **officers** issue fines / approve violations
- Admins manage RBAC, cameras, AI models, audit — not case decisions
- API docs off in prod (`ENABLE_API_DOCS=False`)
- Rate limits on login + API throttles
- Redis password recommended (`REDIS_PASSWORD` in `.env.production.example`)

---

## 8. What is NOT production

| Item | Status |
|------|--------|
| `seed_demo` / `@camtraffic.demo` | Dev & thesis defense only |
| `apps/citizen` Next.js app | Prototype — production citizen UI is `frontend-user` `/citizen/*` |
| Enterprise K8s/Kafka docs | Future roadmap |

---

## 9. Go-live checklist

- [ ] `.env.production` filled; not committed to git  
- [ ] `DEBUG=False`, demo seed flags false  
- [ ] TLS certificates issued and auto-renew cron OK  
- [ ] Bootstrap admin login works; password changed  
- [ ] Officer login → `/officer`; citizen → `/citizen`  
- [ ] Sample detection + officer approve + citizen fine view  
- [ ] Stripe webhook and/or KHQR QR configured; test payment marks fine paid  
- [ ] Nightly backup cron installed; restore drill once  
- [ ] Offsite copy of dumps configured  
- [ ] Uptime monitor on `/health/ready/`  

---

## Related docs

- `deploy/README.md` — compose overview  
- `docs/MULTI-DOMAIN-ARCHITECTURE.md` — Admin / Officer / Citizen  
- `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md` — VPS notes  
- `docs/final-year-project/MAINTENANCE-GUIDE.md` — day-2 ops  
