# Audit App

> **Phase 3** · Tasks **055, 023**

## Overview

Audit log and login history tracking.

## Folder

`backend/apps/audit/`

## Structure

```text
backend/apps/audit/
├── models.py          # AuditLog, LoginHistory
├── services.py        # Audit log summary aggregation
├── serializers.py     # AuditLog and LoginHistory serializers
├── views.py           # Audit log and login history views
├── urls.py
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 055 | ✅ Completed |
| Task 023 | ✅ Completed |

## Status

- [x] Login history model scaffold available
- [x] Login success/failure records stored from auth login endpoint
- [x] `GET /api/v1/audit/login-history/` for admin/super_admin
- [x] `GET /api/v1/audit/logs/` and `GET /api/v1/audit/logs/summary/` for admin/super_admin

## Notes

Task 055 endpoints (admin/super_admin):
- `GET /api/v1/audit/logs/summary/` — totals and breakdown by action/module
- `GET /api/v1/audit/logs/` — filterable audit trail (`action`, `module`, `search`, `date_from`, `date_to`, `limit`)

Seed data: `python manage.py seed_database` creates sample audit log records when none exist.
