# RBAC App

> **Phase 2/3** · Tasks **013–014, 039**

## Overview

Role-based access control:
- role and permission catalogs
- current-user access matrix
- reusable DRF permission classes
- permission CRUD + role-permission assignment workflows
- role CRUD management workflows

## Folder

`backend/apps/rbac/`

## Structure

```text
backend/apps/rbac/
├── models.py          # Permission, Role, UserRole + resolvers
├── serializers.py     # Catalog + management serializers
├── permissions.py     # HasRBACRole / HasRBACPermission
├── views.py           # access/catalog/management endpoints
├── urls.py
└── admin.py
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 013 | ✅ Completed |
| Task 014 | ✅ Completed |
| Task 039 | ✅ Completed |

## Status

- [x] RBAC models + seeded roles/permissions
- [x] `/api/v1/rbac/my-access/` endpoint
- [x] `/api/v1/rbac/roles/` endpoint (admin/super_admin)
- [x] `/api/v1/rbac/permissions/` endpoint (admin/super_admin)
- [x] Reusable RBAC permission classes
- [x] Permission CRUD endpoints (`/permissions/manage/*`)
- [x] Role-permission assignment endpoint (`/roles/{role_id}/permissions/`)
- [x] Role CRUD endpoints (`/roles/manage/*`)

## Notes

_Add implementation notes here as development progresses._
