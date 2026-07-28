# All Portals — Production Ready (verified)

Date: 2026-07-24

## Verdict

**Admin + Officer + Driver are production-ready on live Django REST + PostgreSQL + YOLO** when env flags stay off.

Audits (this machine):

| Portal | Script | Result |
|--------|--------|--------|
| Admin | `scripts/audit_admin_portal_apis.py` | **PASS** (exit 0) — full module matrix |
| Officer | `scripts/audit_officer_portal_apis.py` | **PASS** (exit 0) + live detect + upload YOLO + queue reject + receipt PDF |
| Driver | `scripts/audit_citizen_portal_apis.py` | **PASS** (exit 0) + RBAC 403 |
| Runtime | `scripts/verify_real_data.py` | **PASS** (`AI_USE_MOCK=False`) |

DB snapshot at audit: users 247, vehicles 326, violations 2094, fines 1462, appeals 326, cameras 25 (0 demo URLs), signs 412, AI logs 3042.

## Locked flags (must stay false)

```
# Admin + User portals
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false

# Backend
AI_USE_MOCK=False
AI_PIPELINE_DEMO_VIOLATION=False
```

## Hardened in this pass

- Report Center / Details → live PDF/Excel + live KPIs (no catalog fake rows)
- Admin Reports charts → empty when no API series; vehicle pie from DB distribution
- Admin AI pages → `EMPTY_PAGE_STATS` on failure (no silent DEFAULT mock KPIs)
- Pipeline sample signs gated by `USE_SAMPLE_FALLBACK`
- Cleared `demo-cameras` URLs from Camera rows; seed no longer writes them as live CCTV
- Removed unused `DEMO_MODELS` from Admin AI MLOps pages; Settings defaults are neutral
- Schedules / templates / multi-channel notifications + published model metrics already live
- **Create Violation E2E:** seeded OCR plate `2A-1234` → `driver@camtraffic.demo`; fixed UUID badge crash; plate fuzzy resolve; Observed Action always visible; Admin no longer auto-sends `demo_violation`; Issue Fine = police only; camera demo fallback gated

## Demo image for full Create Violation
`ai/test_samples/car_with_plate_2A-1234.jpg` (+ select Observed Action e.g. ENTER if sign is No Entry)

## Honest limits (not fake data)

1. **RTSP hardware** — cameras need real `frame_source_url` / `rtsp_url` when available
2. **Email / push / SMS** — send when Resend/FCM/Twilio configured; in-app always works
3. **OCR** — assistive + officer confirm (not claimed 100% exact)
4. **248-class mAP** — unpublished until val images restored; cite 10-class 0.908 only
5. **Traffic Rules / Support (Driver)** — intentional static help pages
6. **AI Training Center** — registers weights / copies YOLO CLI; no remote train job server

Empty tables mean empty DB — correct production behavior.
