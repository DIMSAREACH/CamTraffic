# Officer Portal — Production Ready

Verified: 2026-07-24 — `python scripts/audit_officer_portal_apis.py` **PASS** (exit 0)  
Also: `python scripts/verify_real_data.py` **PASS** (`AI_USE_MOCK=False`)

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
```

## Live modules (PostgreSQL + Django REST + YOLO)

| Module | Route | API |
|--------|-------|-----|
| Dashboard | `/officer` | `/api/officer/dashboard/` |
| AI Detection | `/officer/ai-detection` | `/api/ai/stats/`, `/api/detection/live/` |
| AI Detection Center | `/officer/ai-detection/new` | upload + live camera YOLO |
| Cameras | `/officer/cameras` | `/api/officer/cameras/`, live-status |
| Detection queue | `/officer/detection-queue` | approve / reject + optional fine |
| Violations | `/officer/violations` | `/api/officer/violations/` |
| Evidence | `/officer/evidence` | `/api/officer/evidence/` |
| Fines (+ verify payment, receipt PDF) | `/officer/fines` | `/api/officer/fines/`, `/api/fines/:id/verify-payment/`, receipt PDF |
| Appeals review | `/officer/appeals` | `/api/appeals/` |
| Unknown vehicles | `/officer/unknown-vehicles` | `/api/unknown-vehicles/` |
| Driver search | `/officer/driver-search` | `/api/drivers/` |
| Reports / Analytics | `/officer/reports` | `/api/officer/reports/` |
| AI logs | `/officer/ai-logs` | `/api/ai/logs/` |
| Notifications | `/officer/notifications` | `/api/notifications/` |
| Profile / Settings | `/officer/profile` | `/api/auth/profile/` |

## Hardened this pass

- Cleared `demo-cameras` Camera URLs; fleet uses `/media/cctv/*.jpg` (Phnom Penh street stills) or empty/RTSP
- Frontend blanks any `demo-cameras` path when `VITE_ALLOW_DEMO_ASSETS=false` (including `/media/demo-cameras/`)
- Officer map/heatmap deep-links redirect to violations list (driver-only APIs)
- Fine receipt PDF allowed for officers/admins; fixed invalid `select_related('vehicle')` 500
- Audit covers live YOLO, upload detect, queue reject, receipt PDF, RBAC, no-demo camera rows

## RBAC

Drivers receive **403** on `/api/officer/*` and `/api/admin/*`. Officers blocked from admin dashboard (**403**).

## DB snapshot at audit

officers 31 · violations 2094 (pending_review 292) · fines 1462 · appeals 326 · cameras 25 (22 with frames) · signs 412 · AI logs 3042

## Honest limits

1. Replace `/media/cctv/` with real HTTP snapshot / RTSP (+ `STREAM_GATEWAY_URL`) for hardware CCTV
2. Email / push / SMS send when Resend/FCM/Twilio configured; in-app always works
3. OCR is assistive + officer confirm
