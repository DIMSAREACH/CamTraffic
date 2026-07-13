# CamTraffic — Maintenance Guide

**Version:** 1.0 · **Date:** July 2026  
**Task:** 378 · **Audience:** System administrators and DevOps

---

## 1. Routine maintenance schedule

| Frequency | Task | Command / location |
|-----------|------|-------------------|
| Daily | Check health endpoints | `curl https://api.<domain>/health/ready/` |
| Daily | Review error logs | `docker compose logs backend --tail=100` |
| Weekly | PostgreSQL backup verify | `deploy/scripts/backup_postgres.sh` + test restore |
| Weekly | Disk usage | `df -h`, `docker system df` |
| Monthly | SSL cert check | `certbot certificates` |
| Monthly | Rotate old detection logs | Admin → AI Logs → export + archive |
| Quarterly | Dependency updates | `pip list --outdated`, `npm outdated` |
| Quarterly | AI model re-evaluation | Retrain if new sign data collected |

---

## 2. Log management

### Production (JSON logs)

- Volume: `app_logs` mounted in backend container
- Config: `backend/config/logging.py`
- Level: `DJANGO_LOG_LEVEL=INFO` (set `DEBUG` only temporarily)

```bash
docker compose -f deploy/docker/docker-compose.prod.yml logs -f backend
docker compose -f deploy/docker/docker-compose.prod.yml logs -f celery-worker
```

### Development

- Console output from `runserver`
- Celery: `--loglevel=info`

---

## 3. Database maintenance

### Backup

```bash
# Automated (production)
bash deploy/scripts/backup_postgres.sh

# Admin UI backup (includes media + config)
GET /api/dashboard/admin/backup/
```

Backups stored in `backups/` volume. See `deploy/env/BACKUP.md`.

### Restore

```bash
# From admin UI
POST /api/dashboard/admin/backups/<filename>/restore/

# Manual PostgreSQL
gunzip -c backups/camtraffic_YYYYMMDD.sql.gz | psql -U camtraffic camtraffic
```

### Migrations

After code deploy:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py showmigrations
```

---

## 4. Redis & Celery

### Verify Redis

```bash
docker compose exec redis redis-cli ping   # PONG
```

### Restart workers

```bash
docker compose restart celery-worker celery-beat
```

### Common Celery tasks

| Task | Module |
|------|--------|
| Email send | `core.tasks` |
| Scheduled cleanup | Celery beat schedule |

**Windows dev:** Use `--pool=solo` — see `docs/INSTALLATION-GUIDE.md`.

---

## 5. AI model updates

1. Train new weights → `ai/weights/best_v2.pt`
2. Copy to production volume or rebuild `ai-worker` image
3. Register via Admin → AI Models → **Add version**
4. **Activate** new version
5. Verify: `POST /api/ai/detect/` with test image

Rollback: activate previous model version in admin UI.

---

## 6. SSL certificate renewal

Certbot runs in production stack:

```bash
bash deploy/ssl/certbot-renew.sh
docker compose exec nginx nginx -s reload
```

Auto-renewal cron installed by `deploy/scripts/provision_vps_ubuntu.sh`.

---

## 7. Monitoring

| Endpoint | Expected |
|----------|----------|
| `/health/` | 200 OK |
| `/health/ready/` | 200 when DB + Redis up |
| `/health/status/` | JSON with component status |

Integrate with UptimeRobot, Datadog, or similar external monitor.

---

## 8. Security maintenance

| Item | Action |
|------|--------|
| `SECRET_KEY` | Rotate annually; invalidate sessions |
| JWT | Short access token TTL; refresh rotation enabled |
| Dependencies | Patch CVEs promptly |
| Admin accounts | Audit via `/api/audit/` |
| Failed logins | Review `LoginEvent` records |
| Firewall | Allow only 80, 443, SSH from trusted IPs |

---

## 9. Performance tuning

| Component | Knob |
|-----------|------|
| Gunicorn | `deploy/gunicorn/gunicorn.conf.py` — workers, threads |
| PostgreSQL | Connection pool, indexes on `fines.status`, `users.email` |
| Redis | Memory limit, eviction policy |
| Nginx | Gzip, static cache headers |
| AI | Dedicated GPU worker; batch size in inference |

Benchmark reference: `docs/final-year-project/PERFORMANCE-EVALUATION.md`

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 502 Bad Gateway | Backend down | `docker compose restart backend` |
| AI timeout | Model not loaded | Check `AI_MODEL_PATH`, ai-worker logs |
| DB connection refused | Postgres not ready | Wait for healthcheck; verify `DATABASE_URL` |
| CORS errors | Wrong origin | Update `CORS_ALLOWED_ORIGINS` |
| Disk full | Logs or backups | Prune logs; move old backups off-server |
| Celery tasks stuck | Redis down | Restart redis + workers |

---

## 11. Upgrade procedure

1. Pull latest code on VPS
2. `bash deploy/scripts/deploy_production.sh`
3. Verify health endpoints
4. Run smoke test: login → detect → fine flow
5. Monitor logs for 15 minutes

Rollback: redeploy previous Docker image tags from registry or local cache.

---

## 12. Related documents

| Document | Purpose |
|----------|---------|
| `deploy/README.md` | Full deployment runbook |
| `docs/INSTALLATION-GUIDE.md` | Dev setup |
| `deploy/env/BACKUP.md` | Backup policy |
| `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md` | Stage 10 report |
