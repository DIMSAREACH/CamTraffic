# Audit Logs

> **Phase 3** · Tasks **055, 023**

## Overview

System audit logs and login history.

## Folder

`frontend-admin/src/features/audit-logs/`

## Structure

```text
frontend-admin/src/features/audit-logs/
├── AuditLogsManagementPage.tsx  # Audit trail with filters and summary
├── LoginHistoryCard.tsx         # Login history (Task 023)
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 055 | ✅ Completed |
| Task 023 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 055 & 023)

## Notes

Task 055 — audit logs from `/api/v1/audit/logs/`:
- Summary metrics (total, today, top action/module)
- Filters for action, module, search, and date range
- Color-coded action badges in the log list

Task 023 — login history from `/api/v1/audit/login-history/`:
- Shown below audit logs on `/portal/audit`
