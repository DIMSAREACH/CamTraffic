# Admin Portal — Production Ready

Verified: 2026-07-24 — `python scripts/audit_admin_portal_apis.py` **PASS** (exit 0)

## Flags (must stay false)

```
# Admin frontend (.env)
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false

# Backend
AI_USE_MOCK=False
AI_PIPELINE_DEMO_VIOLATION=False
```

## Live modules (Django REST + PostgreSQL + YOLO)

| Module | API |
|--------|-----|
| Dashboard | `/api/admin/dashboard/`, `/api/cameras/live-status/` |
| Users / Roles / Officers / Drivers | `/api/admin/users/`, `/api/rbac/roles/`, `/api/officers/`, `/api/drivers/`, `/api/officers/stations/` |
| Vehicles / Unknown | `/api/vehicles/`, `/api/unknown-vehicles/` |
| Fines / Violations / Appeals | `/api/fines/`, `/api/violations/`, `/api/appeals/` |
| Cameras / Roads / Signs | `/api/admin/cameras/`, `/api/roads/`, `/api/signs/` |
| AI Detection / Logs / Stats | `/api/ai/stats/`, `/api/ai/logs/`, detect pipeline |
| AI Models / Datasets / Metrics | `/api/ai-models/`, `/api/datasets/`, `/api/ai/model-metrics/` |
| Evidence | `/api/dashboard/evidence/` |
| Reports + Analytics + PDF | `/api/dashboard/admin/analytics/*`, `/api/dashboard/admin/report/pdf/` |
| Notifications (list/send/templates/schedules) | `/api/notifications/admin/*` |
| Audit / Settings / Backup / Import | `/api/admin/audit/`, `/api/settings/`, `/api/dashboard/admin/backups/`, `/api/imports/*` |

## Hardened this pass

- Removed unused `DEMO_MODELS` from AI Deployments / History / Details
- Stripped fictional report catalog rows (kept province filter list only)
- Settings form defaults are neutral (no RTX 4090 / fake IP / MPWT fiction before API load)
- Cleared remaining `demo-cameras` URLs from Camera rows (0 remain)
- Audit covers all Admin module endpoints + RBAC + stations + analytics + PDF
- Production Vite build blocks mock/sample/demo env flags

## DB snapshot at audit

users 247 · cameras 25 · vehicles 326 · violations 2094 · fines 1462 · appeals 326 · signs 412 · AI logs 3042

Empty tables = empty DB (correct). Cameras without RTSP show empty frame URL until real feeds are configured.

See `ALL-PORTALS-PRODUCTION-READY.md` for cross-portal notes.
