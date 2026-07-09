# System Demonstration Script

**Task 152 — System Demonstration**
**Duration**: ~10 minutes live demo
**Prerequisite**: All services running via `docker compose up -d`

---

## Pre-Demo Checklist

- [ ] `docker compose up -d` — all 7 services healthy
- [ ] Seed data applied (`python manage.py seed_database`)
- [ ] Admin credentials ready: `admin` / `admin1234`
- [ ] Officer credentials ready: `officer@demo.com` / `officer1234`
- [ ] Driver credentials ready: `driver@demo.com` / `driver1234`
- [ ] Browser windows open: Admin Portal (:5173), Driver Portal (:5174)
- [ ] AI service health check passing: `curl http://localhost:8001/health`
- [ ] Sample camera frame image ready: `docs/final-year-project/demo-frame.jpg`

---

## Demo Scene 1 — Login & Dashboard (1 min)

1. Open **Admin Portal** (`http://localhost:5173`)
2. Log in as `admin` / `admin1234`
3. **Point out**: Role-based dashboard with today's stats, camera status, AI summary
4. Switch language to **Khmer** (🌐) — show i18n support
5. Switch back to English

---

## Demo Scene 2 — Camera Management (1 min)

1. Navigate to **Cameras → Management**
2. Show the registered camera list with status (online/offline)
3. Click **Health Check** on a camera — show result
4. Click a camera → show live dashboard link and RTSP stream URL field
5. Point out the camera is linked to a **Police Station**

---

## Demo Scene 3 — Submit a Camera Frame (2 min)

> This is the core AI pipeline demo.

1. Open a terminal (or use Postman / curl)
2. Submit a frame:
   ```bash
   curl -X POST http://localhost:8000/api/v1/integration/cameras/1/process-frame/?sync=1 \
     -H "Authorization: Bearer <admin-token>" \
     -F "image=@docs/final-year-project/demo-frame.jpg"
   ```
3. Show the JSON response:
   - `detection_id`, `violation_id` (if plate matched), `officers_notified`
4. Navigate to **Detections → Live Monitor** — show the new detection appeared
5. Click the detection — show evidence image, bounding box data, confidence, plate text

---

## Demo Scene 4 — Officer Reviews a Violation (2 min)

1. Log in as **Officer** in a second browser window
2. Officer dashboard shows **1 pending violation**
3. Navigate to **Violations → Review Queue**
4. Click the violation — show:
   - Detection evidence image
   - Traffic sign detected + confidence
   - OCR plate text
   - Vehicle and driver details
5. Click **Approve** → add officer notes → confirm
6. Show that a **Fine** was auto-generated

---

## Demo Scene 5 — Driver Portal (2 min)

1. Switch to **Driver Portal** (`http://localhost:5174`)
2. Log in as `driver@demo.com`
3. Dashboard shows **1 active violation** and **1 unpaid fine**
4. Navigate to **My Violations** — click to see evidence
5. Navigate to **My Fines** — click **Pay Now** → confirm payment
6. Show receipt under **Payment History**
7. Show **Notifications** bell — driver was notified when violation was created

---

## Demo Scene 6 — Live Feed SSE (1 min)

1. Open browser dev tools → Network tab
2. Navigate to **Detections → Live Monitor**
3. Show the SSE `EventStream` connection in the Network tab
4. Submit another camera frame — show detection appearing without page refresh

---

## Demo Scene 7 — Reports (30 sec)

1. Log in as Admin → **Reports**
2. Select "Violations by Date Range" → set this week
3. Click **Generate** → show CSV download

---

## Fallback (if AI service is in mock mode)

> If `AI_DETECTION_MODE=mock`, the pipeline still runs end-to-end with synthetic detections.
> Mention this explicitly: "In this demo environment, the AI service returns mock detections.
> In production with trained weights, real YOLOv11 inference is used."

---

## Demo Commands Quick Reference

```bash
# Get admin JWT token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camtraffic.kh","password":"admin1234"}'

# Check AI service
curl http://localhost:8001/health

# Submit frame (sync)
curl -X POST "http://localhost:8000/api/v1/integration/cameras/1/process-frame/?sync=1" \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@demo-frame.jpg"

# Live SSE feed
curl -N -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/integration/detections/live-feed/
```
