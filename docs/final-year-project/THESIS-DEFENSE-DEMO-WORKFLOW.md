# CamTraffic — Thesis Defense Demo Workflow

**Scenario:** Driver parks in a **No Parking** zone → officer runs AI detection → approve → fine → driver appeal → officer decision → admin reports.

**Duration:** 10–15 minutes · **Verified API loop:** `node scripts/backend-python.mjs scripts/demo_thesis_workflow.py` → **13/13 PASS** (2026-07-25)

---

## Before you start

| Item | Value |
|------|--------|
| Backend | `http://127.0.0.1:8000` (`npm` / `manage.py runserver`) |
| Officer + Driver UI | http://127.0.0.1:5173 |
| Admin UI | http://127.0.0.1:5174 |
| Password (all demos) | `CamTraffic@2026!` |
| Admin | `admin@camtraffic.demo` |
| Officer | `officer@camtraffic.demo` |
| Driver | `driver@camtraffic.demo` |
| Demo plate | `2A-1234` |
| Flags | `AI_USE_MOCK=False`, `VITE_USE_MOCK=false` |

**Recommended media**

| Use | File |
|-----|------|
| Live YOLO image (signs + car boxes) | `ai/test_samples/real_road/road_15.jpg` |
| Video upload | `src/web/user/public/demo-cameras/pp-riverside-traffic.webm` |
| No Parking icon (evidence / catalog) | `ai/test_samples/real/07_no_parking.png` |

> Clean sign PNGs alone often return `detection_mode=no_sign` on the live 26-class weights. For defense, prefer **road / CCTV video**, then set **Observed Action = Parking** and **Edit Plate = 2A-1234** if OCR misses.

**Fine amount (honest):** No Parking rule = **$8 USD ≈ 32,800 KHR** (UI may show KHR via ×4100). Not 80,000 KHR unless you change the seeded rule.

**Appeal statuses in API/UI:** `upheld` (driver wins) / `dismissed` (fine stands).

---

## Recommended speaking order (10–15 min)

### 1) Admin — Dashboard & oversight (1–2 min)

1. Open http://127.0.0.1:5174 → login as admin  
2. `/admin/dashboard` — users, officers, drivers, fines, detections, cameras  
3. Optional flash: `/admin/cameras`, `/admin/users`  
4. Say: *“Admin governs the platform; officers decide cases.”*

### 2) Officer — AI Detection (3–4 min)

1. http://127.0.0.1:5173 → login as officer → `/officer`  
2. Open **AI Detection** → **New Detection** (`/officer/ai-detection/new`)  
3. Show modes: **Upload Image / Upload Video / Webcam / Live Camera**  
4. Upload `road_15.jpg` or `pp-riverside-traffic.webm`  
5. Show bounding boxes, sign label, confidence, vehicle, plate (edit to `2A-1234` if needed)  
6. Set **Observed Action = Parking** when demonstrating No Parking enforcement  
7. Create / send case to review queue when UI offers it  

### 3) Officer — Review → Violation → Fine (2–3 min)

1. Open **AI Review Queue** (`/officer/detection-queue`)  
2. Open the No Parking pending case  
3. Check evidence, OCR/plate, time, location  
4. Click **Approve** (issue fine)  
5. Show `/officer/violations` and `/officer/fines`  
6. Say: *“AI suggests; the officer confirms. Fine notifies the driver.”*

### 4) Driver — View evidence & appeal (2–3 min)

1. Logout → login as driver → `/citizen`  
2. Dashboard: pending fine / recent violation  
3. **My Violations** / **My Fines** — open evidence  
4. Click **Appeal** → reason → submit → status pending  
5. Optional: **Notifications** bell  

### 5) Officer — Appeal decision (1–2 min)

1. Login officer → `/officer/appeals`  
2. Open appeal → **Dismiss** (fine stands) or **Uphold** (waive)  
3. Say: *“Human review closes the loop.”*

### 6) Admin — Reports & audit (1–2 min)

1. `/admin/reports` — charts / PDF / Excel  
2. `/admin/audit-logs` — approve → fine → appeal → review trail  
3. Close: *“One workflow connects AI, enforcement, citizen service, and governance.”*

---

## End-to-end flow (system)

```text
Admin cameras/users (optional)
        │
Officer AI Detection (image/video/webcam/live)
        │
YOLO signs + vehicles → OCR plate (editable)
        │
Observed action + rule engine → suggestion
        │
Officer Detection Queue → Approve / Reject
        │
TrafficViolation confirmed + Fine (~32,800 KHR)
        │
In-app notification to driver (+ email if Resend configured)
        │
Driver views evidence → Pay OR Appeal
        │
Officer/Admin appeal review (upheld | dismissed)
        │
Admin reports + audit log
```

---

## Module checklist (what to click)

### Admin (core for demo)
Dashboard · Cameras · Users · Violations · Fines · Appeals · Reports · Audit Logs · (optional) AI Models / Signs / Settings

### Officer
Dashboard · AI Detection · Detection Queue · Violations · Fines · Appeals · Cameras · Detection History / AI Logs · Evidence

### Driver
Dashboard · My Vehicles · Violations · My Fines · Appeals · Notifications · Settings

---

## API verification (optional, before viva)

```bash
# Backend must be running
node scripts/backend-python.mjs scripts/demo_thesis_workflow.py
```

Covers: login ×3 · image/video detect smoke · pending No Parking case · approve+fine · driver fines/notifications · appeal · appeal review · admin reports/audit.

---

## Fixes applied for this workflow (2026-07-25)

1. Officer **approve** no longer 500s on Postgres (`select_for_update` + nullable joins).  
2. Detection accepts officer **`plate_text` override** so plate `2A-1234` can link the demo driver when OCR misses.  
3. Approve returns a clear error if no driver is linked (instead of crashing).  

---

## Honest limits (say this if asked)

- Email delivery needs Resend/SMTP; **in-app notifications always work**.  
- Live RTSP cameras need real URLs; sample stills/webm are for demo.  
- OCR is assistive — officer confirms plate.  
- Annotated video is available as preview/download in the detection center; prefer showing the overlay results panel live.
