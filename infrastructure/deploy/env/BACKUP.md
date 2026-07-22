# CamTraffic — Database Backup & Restore

**Production DR** · PostgreSQL logical dumps + optional Django media ZIP

---

## What gets backed up

| Artifact | Script / API | Location |
|----------|--------------|----------|
| PostgreSQL dump | `deploy/scripts/backup_postgres.sh` | `backend/backups/pg-backup-*.sql.gz` |
| Media + manifest | `python manage.py backup_system` (called by backup script) | `backend/backups/` |
| Admin ZIP (UI) | `GET /api/dashboard/admin/backup/` | downloaded by admin |

Cron installer: `deploy/scripts/install_backup_cron.sh` (nightly).

---

## Backup (production)

```bash
# From repo root on the VPS
./deploy/scripts/backup_postgres.sh
```

Verify a new `.sql.gz` appeared under `backend/backups/`.

**Offsite (recommended):** copy dumps to R2/S3 or another VPS:

```bash
# Example — adapt to your storage
scp backend/backups/pg-backup-*.sql.gz backup-user@offsite:/var/backups/camtraffic/
```

Retention suggestion: keep 7 daily + 4 weekly locally; offsite 30 days.

---

## Restore

```bash
./deploy/scripts/restore_postgres.sh backend/backups/pg-backup-YYYYMMDD-HHMMSS.sql.gz
# Type YES when prompted
```

Then:

```bash
curl -fsS https://api.YOUR_DOMAIN/health/ready/
# Log in as bootstrap admin and spot-check users / violations / fines
```

---

## Production rules

1. **Do not** run `seed_demo` after restore on public production.
2. Prefer `bootstrap_admin_env` for the first admin account.
3. Test restore on a staging clone at least once before defense / go-live.
4. Keep `DEBUG=False` and strong `SECRET_KEY` / `DB_PASSWORD`.

---

## Related

- `docs/PRODUCTION-RUNBOOK.md`
- `docs/final-year-project/MAINTENANCE-GUIDE.md`
- `deploy/scripts/deploy_production.sh`
