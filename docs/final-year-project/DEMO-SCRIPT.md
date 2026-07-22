# CamTraffic — Demo Script (7 Scenes)

**Task 402** · Defense / Viva · **Duration:** ~12 minutes  
**Roles:** Administrator, Traffic Police Officer, Driver

---

## Pre-demo checklist

| Step | Command / action |
|------|------------------|
| Backend | `cd src/backend && python manage.py runserver` |
| User portal | `npm run dev:user` → http://localhost:5173 |
| Admin portal | `npm run dev:admin` → http://localhost:5174 |
| AI weights | Use **248-class** `ai/weights/best.pt` (`AI_MODEL_PATH`) |
| Confirm load | Startup log: `Loaded sign YOLO: 248 classes` |
| Seed data | `npm run seed:demo` |
| Test accounts | `docs/final-year-project/DEMO-ACCOUNTS.md` |
| Model story | [`docs/AI-MODEL-STORY.md`](../AI-MODEL-STORY.md) |

**Fallback:** Pre-recorded video per `FINAL-DEMO-VIDEO-PACKAGE.md`

**AI story (one line):** Live = **248** (`best.pt`); thesis mAP@50 = 0.908 = **10-class** eval (`best_v2.pt`) only.

---

## Scene 1 — Admin login & dashboard (1 min)

**Portal:** Administration · http://localhost:5174 → `/admin`  
**Account:** `admin@camtraffic.demo`

1. Open admin portal → log in as administrator → confirm `/admin/...`
2. Show dashboard KPI widgets (auto-refresh every 30s)
3. Highlight **Live cameras** status from `/api/cameras/live-status/`
4. Mention bilingual toggle (Khmer/English) in header

**Say:** *"Administrators govern the system—users, RBAC, cameras, AI models, and audit—not case decisions."*

---

## Scene 2 — Camera monitoring (2 min)

**Navigation:** Cameras

1. Open **Cameras** page → live frame grid (5s refresh)
2. Point out online/offline health indicators
3. Select a camera → click **Run AI detect** on latest snapshot
4. Show detection overlay returning sign class + confidence

**Say:** *"Fixed cameras feed frames into the same AI pipeline as manual uploads."*

---

## Scene 3 — AI detection (2 min)

**Navigation:** AI Detection (admin or officer portal)

1. Upload a traffic scene image **or** use webcam panel
2. Show detected sign class, confidence score, Khmer/English labels
3. If vehicle visible: show bounding box + plate OCR result
4. Optional: Khmer TTS for sign name

**Test image:** Prefer `ai/test_samples/real/03_no_entry.png` or `01_stop.png` (real Cambodian signs). Fallback: `demo_no_entry.png` / `demo_stop.png`.

**Say:** *"Live detection uses our full 248-class Cambodian sign model. Separately, the balanced 10-class subset reached mAP@50 of 0.908 for thesis evaluation."*

---

## Scene 4 — Violation auto-create (2 min)

**Settings:** Enable auto-create violation on Cameras or AI Detection page

1. Run detection on a sign that matches a violation rule
2. Show new record in **Violations** queue (status: pending)
3. Open violation detail → evidence thumbnail attached
4. Switch to driver account → show in-app notification (bell icon)

**Say:** *"The rule engine maps sign classes to prohibited actions—AI perceives, rules decide."*

---

## Scene 5 — Officer review & fine issuance (2 min)

**Portal:** Traffic Operations · http://localhost:5173 → `/officer`  
**Account:** `officer@camtraffic.demo`

1. Log in as traffic police (Officer tab) → confirm URL is `/officer`
2. Open pending violation → review evidence image
3. Confirm violation → navigate to **Fines** → **Issue Fine**
4. Lookup driver by license → set amount → submit
5. Show fine PDF export option

**Say:** *"Officers retain final authority—automation assists, not replaces, judgment. Admins cannot issue fines."*

---

## Scene 6 — Driver / Citizen portal (2 min)

**Portal:** Citizen Service · http://localhost:5173 → `/citizen`  
**Account:** `driver@camtraffic.demo`

1. Log in as driver (Driver tab) → confirm URL is `/citizen`
2. Show violation and fine on dashboard
3. Open **Fines** → view amount, due date, linked evidence
4. Click **Pay Now** (demo payment recording)
5. Show notification bell with fine alert

**Say:** *"Citizens only see their own records—self-service for vehicles, fines, and appeals."*
**Say:** *"Drivers have transparent access to evidence and can submit appeals."*

---

## Scene 7 — Reports & metrics wrap-up (1 min)

**Portal:** Admin

1. Navigate to **Reports** → export PDF enforcement report
2. Optional: Excel export from dashboard
3. Display AI metrics slide or terminal: mAP@50 = **0.908**
4. Reference UAT pass and 4/4 E2E tests

**Say:** *"CamTraffic delivers detection accuracy, full enforcement workflow, and production-ready deployment."*

---

## Timing summary

| Scene | Duration | Cumulative |
|-------|----------|------------|
| 1 Admin dashboard | 1 min | 1 min |
| 2 Cameras | 2 min | 3 min |
| 3 AI detection | 2 min | 5 min |
| 4 Violation create | 2 min | 7 min |
| 5 Officer fine | 2 min | 9 min |
| 6 Driver portal | 2 min | 11 min |
| 7 Reports | 1 min | 12 min |

---

## Reset after demo

```bash
cd backend
python manage.py seed_data          # restore reference data
# Or restore from backup ZIP via admin System Settings
```

---

## Troubleshooting during live demo

| Issue | Quick fix |
|-------|-----------|
| AI returns mock data | Set `AI_USE_MOCK=False` in `backend/.env`, restart server |
| CORS error | Confirm Vite proxy in frontend `.env` |
| Login fails | Re-run seed; check role matches portal |
| Detection slow | Use pre-uploaded image instead of webcam |
| Port conflict | Use `npm run dev` from root (configured ports) |

See also: `LIVE-DEMO-SETUP-VALIDATION.md`
