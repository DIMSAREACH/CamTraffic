# Multi-domain architecture — implementation notes

CamTraffic separates **Administration**, **Traffic Operations**, and **Citizen Service**.

## Portals

| Domain | App | Folder | Routes |
|--------|-----|--------|--------|
| Administration | `frontend-admin` | `admin/` | `/admin/*` |
| Traffic Operations | `frontend-user` | `officer/` | `/officer/*` |
| Citizen Service | `frontend-user` | `citizen/` | `/citizen/*` |

```
frontend-user/
├── officer/     # layout, navigation, pages
├── citizen/     # layout, navigation, pages
├── user/        # shared UserLayout + DashboardPage switcher
└── shared/
```

Legacy `/dashboard/*` redirects to `/officer/*` or `/citizen/*` by stored role.

## Backend API namespaces

| Namespace | Purpose |
|-----------|---------|
| `/api/v1/admin/` (also `/api/admin/`) | Users, RBAC, cameras, audit, AI models, reports |
| `/api/v1/officer/` | Detection queue, approve/reject, issue fine, evidence, live cameras |
| `/api/v1/citizen/` | Profile, vehicles, violations, fines, appeals, notifications |

## Frontend API wiring

Role-aware clients call domain namespaces when the SPA route matches:

| Portal route | Typical API prefix |
|--------------|--------------------|
| `/admin/*` | `/api/admin/…` |
| `/officer/*` | `/api/officer/…` |
| `/citizen/*` | `/api/citizen/…` |

Helpers: `frontend-*/shared/constants/domainApi.ts`  
Legacy flat URLs remain as fallback when the path domain cannot be inferred.

## Permission rule (enforcement)

- **Only officers (`police`)** may approve/reject violations and issue fines.
- Admins manage the system; they do **not** perform case decisions.

Thesis text: `docs/final-year-project/thesis/CHAPTER-4-2-5-MULTI-DOMAIN-ARCHITECTURE.md`
