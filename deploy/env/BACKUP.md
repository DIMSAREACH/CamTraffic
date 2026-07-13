# CamTraffic — Backup & Restore Strategy

**Layout (actual repo paths, not `backend/apps/`):**

| Path | Purpose |
|------|---------|
| `backend/core/backup_service.py` | ZIP backup/restore (DB dump, media, optional AI weights) |
| `backend/core/management/commands/backup_system.py` | CLI: `python manage.py backup_system` |
| `backend/core/management/commands/restore_system.py` | CLI: `python manage.py restore_system <archive.zip>` |
| `backend/backups/` | Stored archives (`BACKUP_ROOT` in `camtraffic/settings.py`) |
| `backend/media/` | User uploads, KYC images, AI evidence |

## Environment

```env
# backend/.env (optional overrides)
BACKUP_ROOT=backups
BACKUP_INCLUDE_AI_WEIGHTS=false
```

Default `BACKUP_ROOT` resolves to `backend/backups/` (gitignored).

## Create backup

From `backend/`:

```bash
python manage.py backup_system
```

Or via admin dashboard API (`dashboardAPI.downloadSystemBackup()` → `/api/dashboard/backup/`).

Each archive includes:

- Database dump (PostgreSQL `pg_dump` or SQLite copy)
- `media/` tree
- Manifest JSON (version, timestamp, file counts)
- Optional `ai/weights/` when `BACKUP_INCLUDE_AI_WEIGHTS=true`

Retention: last **10** archives (`MAX_STORED_BACKUPS` in `backup_service.py`).

## Restore

```bash
python manage.py restore_system backups/camtraffic-backup-YYYYMMDD-HHMMSS.zip
```

**Warning:** Restore overwrites database and media. Run on staging first.

## Production notes

- Schedule nightly backups via Celery beat or cron calling `backup_system`.
- Copy archives off-server (S3, NAS, or encrypted object storage).
- Test restore quarterly on a non-production clone.
- Keep PostgreSQL credentials in `backend/.env`; never commit `.env`.

## Related

- `docker-compose.yml` — Postgres volume persistence
- `deploy/env/DATASET_BACKUP.md` — AI dataset / weights backup
- `docs/FOLDER-MAP.md` — repository layout
