# CamTraffic — All Modules Connected Workflow

Thesis map of **every module** into one business lifecycle.  
Verified: `npm run verify:all-modules` (2026-07-25).

Defense click path (shorter): [`THESIS-DEFENSE-DEMO-WORKFLOW.md`](final-year-project/THESIS-DEFENSE-DEMO-WORKFLOW.md)

---

## Overall system (connected)

```text
Admin configures users / cameras / signs / AI models / settings
        │
        ▼
Officer AI Detection (image | video | webcam | live camera)
        │
        ▼
YOLO + EasyOCR → AIDetectionLog + suggested violation
        │
        ▼
Detection Review Queue
   ┌────┴─────┐
   ▼          ▼
Approve    Reject  → AIDetectionLog.review_status synced
   │          │
   ▼          ▼
Violation  (no fine)
   │
   ▼
Fine + in-app notification (email if Resend configured)
   │
   ▼
Driver portal: evidence / pay / appeal
   │
   ├─ Pay → paid or awaiting_verification (+ officer verify)
   └─ Appeal → officer/admin upheld|dismissed → fine updated
   │
   ▼
Reports & Analytics → Audit Logs → Backup
```

### Realtime Upload Video + Live Camera

| Mode | API | UI |
|------|-----|----|
| Upload Video (frame stream) | `POST /api/ai/video/upload/` → SSE `GET /api/ai/video/{id}/stream/` → result/review | AI Detection → **Upload Video** |
| Live Camera session | `POST /api/ai/live/start/` · `frame/` · `snapshot/` · `record/*` · `stop/` | AI Detection → **Live Camera** |

Persists `VideoDetection` / `VideoFrame` / `VideoEvidence`. Boxes: sign blue, vehicle green, plate yellow, violation red. Stream transport is **SSE** (JWT header; no django-channels yet).

---

## Module matrix (UI ↔ API)

### Admin (`http://127.0.0.1:5174`)

| Module | Route | API | Status |
|--------|-------|-----|:------:|
| Dashboard | `/admin/dashboard` | `/api/dashboard/admin/` | ✅ |
| Users | `/admin/users` | `/api/users/` | ✅ |
| Officers | `/admin/officers` | `/api/officers/` | ✅ |
| Drivers | `/admin/drivers` | `/api/drivers/` | ✅ |
| Vehicles | `/admin/vehicles` | `/api/vehicles/` | ✅ |
| Roads | `/admin/roads` | `/api/roads/` | ✅ |
| Cameras | `/admin/cameras` | `/api/cameras/` | ✅ |
| Traffic Signs | `/admin/signs` | `/api/signs/` | ✅ |
| AI Models | `/admin/ai-models` | `/api/ai-models/` | ✅ |
| Detection History | `/admin/ai-logs` | `/api/ai/logs/` | ✅ |
| Violations | `/admin/violations` | `/api/violations/` | ✅ |
| Fines | `/admin/fines` | `/api/fines/` | ✅ |
| Appeals | `/admin/appeals` | `/api/appeals/` | ✅ |
| Reports | `/admin/reports` | `/api/reports/dashboard/` | ✅ |
| Audit Logs | `/admin/audit-logs` | `/api/audit/` | ✅ |
| System Settings | `/admin/settings` | `/api/settings/` | ✅ |
| Backup & Restore | `/admin/backup-restore` | `/api/dashboard/admin/backup(s)/` | ✅ |
| Evidence | `/admin/evidence` | `/api/dashboard/evidence/` | ✅ |
| Notifications | `/admin/notifications` | `/api/notifications/` | ✅ |

### Officer (`http://127.0.0.1:5173/officer`)

| Module | Route | API | Status |
|--------|-------|-----|:------:|
| Dashboard | `/officer` | `/api/officer/dashboard/` | ✅ |
| AI Detection | `/officer/ai-detection/new` | `/api/detection/{image,video,webcam,live}/` | ✅ |
| Detection Queue | `/officer/detection-queue` | `/api/officer/detection-queue/` + approve/reject | ✅ |
| Violations | `/officer/violations` | `/api/officer/violations/` | ✅ |
| Fines | `/officer/fines` | `/api/officer/fines/` | ✅ |
| Appeals | `/officer/appeals` | `/api/appeals/{id}/review/` | ✅ |
| Cameras | `/officer/cameras` | `/api/officer/cameras/` | ✅ |
| Evidence | `/officer/evidence` | `/api/officer/evidence/` | ✅ |
| Detection History | `/officer/ai-logs` | `/api/ai/logs/` | ✅ |
| Reports | `/officer/reports` | `/api/officer/reports/` | ✅ |
| Notifications | `/officer/notifications` | `/api/notifications/` | ✅ |

### Driver (`http://127.0.0.1:5173/citizen`)

| Module | Route | API | Status |
|--------|-------|-----|:------:|
| Dashboard | `/citizen` | `/api/citizen/dashboard/` | ✅ |
| My Vehicles | `/citizen/vehicles` | `/api/citizen/vehicles/` | ✅ |
| Violations | `/citizen/violations` | `/api/citizen/violations/` | ✅ |
| My Fines / Pay | `/citizen/fines` | `/api/citizen/fines/`, `…/pay/` | ✅ |
| Appeals | `/citizen/appeals` | `/api/citizen/appeals/` | ✅ |
| Evidence | `/citizen/evidence` | `/api/dashboard/evidence/` (own records) | ✅ |
| Notifications | `/citizen/notifications` | `/api/citizen/notifications/` | ✅ |
| Settings | `/citizen/settings` | `/api/auth/profile/` | ✅ |

---

## Status vocabularies (use these in viva)

| Entity | Statuses |
|--------|----------|
| Violation | `pending_review` → `confirmed` \| `rejected` |
| Fine | `pending` → `paid` \| `awaiting_verification` \| `overdue` \| `disputed` \| `dismissed` |
| Appeal | `pending` → `upheld` \| `dismissed` |
| AIDetectionLog | `pending` → `approved` \| `rejected` (synced on queue decision) |

---

## Honest limits (still connected, optional channels)

1. **Email** — in-app notifications always fire; email needs Resend/SMTP.  
2. **Pay** — KHQR/ABA often → `awaiting_verification` until officer verifies; manual/stub can mark paid.  
3. **RTSP** — cameras need real URLs for hardware; sample stills/webm for demo.  
4. **OCR** — assistive; officer may edit plate before approve.

---

## How to verify

```bash
# API health of every module + approve/reject/appeal/pay chain
npm run verify:all-modules

# Shorter thesis demo chain
npm run verify:thesis-demo
```

Accounts: see [`final-year-project/DEMO-ACCOUNTS.md`](final-year-project/DEMO-ACCOUNTS.md).
