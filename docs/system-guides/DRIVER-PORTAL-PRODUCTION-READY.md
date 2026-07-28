# Driver (Citizen) Portal — Production Ready

Verified: 2026-07-24 — `python scripts/audit_citizen_portal_apis.py` **PASS**

Audit driver: `driver@camtraffic.demo` (10 vehicles, 57 fines) against live PostgreSQL.

## Flags (must stay false)

```
# src/web/user/.env
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false

# src/backend/.env
AI_USE_MOCK=False
AI_PIPELINE_DEMO_VIOLATION=False
PAYMENT_MODE=khqr
```

Driver (`/citizen`) also hard-blocks sample-row injection at runtime even if a DEV sample flag is flipped.

## Live modules (real REST + DB)

| Module | Route | API |
|--------|-------|-----|
| Dashboard | `/citizen` | `GET /api/citizen/dashboard/` |
| Profile | `/citizen/profile` | `/api/citizen/profile/`, `/api/auth/profile/` |
| Vehicles | `/citizen/vehicles` | `/api/citizen/vehicles/` |
| Violations (+ map / heatmap) | `/citizen/violations…` | `/api/citizen/violations/`, map, heatmap |
| Fines / pay / KHQR / receipt | `/citizen/fines…` | `/api/citizen/fines/…` |
| Installments | `/citizen/fines/:id/installments` | quote / create / pay |
| Payment history | `/citizen/fines/payments` | paid fines from live list |
| Appeals | `/citizen/appeals` | `/api/citizen/appeals/` |
| Notifications + prefs | `/citizen/notifications`, settings | `/api/citizen/notifications/` |
| Signs catalog | `/citizen/signs` | `GET /api/signs/` |
| Auth | login / register / reset | `/api/auth/…` |

## AI in the Driver portal

Drivers do **not** run the operational AI console (blocked → home). AI still appears as **real evidence** on their violations/fines: plate crop, vehicle crop, detection log link — from YOLO pipeline records in the DB.

## Payments

- Modes: KHQR + manual proof (`demo_fallback=false`)
- Stripe optional / off unless `STRIPE_SECRET_KEY` is configured
- Installment quote/create/pay live

## RBAC

Driver blocked (**403**) from `/api/officer/dashboard/` and `/api/admin/dashboard/`.

## By design (not sample DB)

Traffic Rules + Support = static educational help content (hotline `1280`, no “(demo)” label).

## DB snapshot at last audit

drivers 160 · vehicles 326 · violations 2094 · fines 1462 · appeals 326
