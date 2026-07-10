# Phase 3 — Frontend Admin

Tasks **025–058**

See [frontend-admin/docs/FEATURES.md](../../frontend-admin/docs/FEATURES.md) for the full module index.

## Admin Foundation (025–031)

| Task | Name | Folder |
|------|------|--------|
| 025 | Admin Project Structure | `frontend-admin/src/` |
| 026 | Admin Routing | `frontend-admin/src/routes/` |
| 027 | Admin Layout | `frontend-admin/src/layouts/` |
| 028 | Sidebar Navigation | `frontend-admin/src/layouts/` |
| 029 | Header | `frontend-admin/src/layouts/` |
| 030 | Footer | `frontend-admin/src/layouts/` |
| 031 | Dashboard Home | `frontend-admin/src/features/dashboard/` |

## Status

- [x] Task 025 — app bootstrap/providers + core src module boundaries
- [x] Task 026 — BrowserRouter routes + protected `/portal` guard
- [x] Task 027 — reusable admin layout shell integrated in authenticated portal
- [x] Task 028 — sidebar navigation with active route highlighting
- [x] Task 029 — dedicated admin header component integrated into layout shell
- [x] Task 030 — dedicated admin footer component integrated into layout shell
- [x] Task 031 — dashboard home page and `/portal/dashboard` landing route
- [x] Task 032 — dashboard statistics widget with backend aggregate API
- [x] Task 033 — dashboard chart widgets with backend chart-series API
- [x] Task 034 — recent activities feed with backend activity endpoint
- [x] Task 035 — AI detection summary widget with backend AI summary endpoint
- [x] Task 036 — camera status widget with backend camera-status endpoint
- [x] Task 037 — notification center widget with backend notifications endpoint
- [x] Task 038 — user CRUD management page and backend user-management endpoints
- [x] Task 039 — role CRUD management page and backend role-management endpoints
- [x] Task 040 — permission CRUD management page and backend permission-management endpoints
- [x] Task 041 — officer management page and backend officer-management endpoints
- [x] Task 042 — police station management page and backend station-management endpoints
- [x] Task 043 — AI model management page and backend model-management endpoints
- [x] Task 044 — AI model versioning panel and backend version-management endpoints
- [x] Task 045 — AI training history panel and backend training-history endpoints
- [x] Task 046 — detection monitoring panel and backend detection-monitoring endpoints
- [x] Task 047 — camera CRUD page and backend camera-management endpoints
- [x] Task 048 — live camera dashboard panel and backend live-dashboard endpoint
- [x] Task 049 — camera health monitoring panel and backend health-check endpoints
- [x] Task 050 — traffic sign CRUD page and backend traffic-sign-management endpoints
- [x] Task 051 — sign category CRUD page and backend category-management endpoints
- [x] Task 052 — reports page and backend report-export endpoints
- [x] Task 053 — analytics dashboard page and backend analytics endpoint
- [x] Task 054 — PDF/Excel report export generation (reportlab + openpyxl)
- [x] Task 055 — audit logs page and backend audit-log endpoints
- [x] Task 056 — notification template CRUD page and backend template endpoints
- [x] Task 057 — system settings CRUD page and backend settings endpoints
- [x] Task 058 — backup and restore page with JSON snapshot endpoints

## Dashboard (032–037)

Tasks 032–037 → `frontend-admin/src/features/dashboard/`

## User Management (038–040)

| Task | Folder |
|------|--------|
| 038 User CRUD | `frontend-admin/src/features/users/` |
| 039 Role CRUD | `frontend-admin/src/features/roles/` |
| 040 Permission CRUD | `frontend-admin/src/features/permissions/` |

## Officer, AI, Camera, Signs, Reports, System (041–058)

See feature README files under `frontend-admin/src/features/`.
