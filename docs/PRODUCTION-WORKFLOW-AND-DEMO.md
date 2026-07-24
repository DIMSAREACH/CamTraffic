# CamTraffic — Full Production Workflow & System Demo

**Project:** AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Audience:** Thesis defense, operators, examiners  
**Related:** [`SYSTEM-WORKFLOW.md`](./SYSTEM-WORKFLOW.md) · [`PRODUCTION-RUNBOOK.md`](./PRODUCTION-RUNBOOK.md) · [`final-year-project/DEMO-SCRIPT.md`](./final-year-project/DEMO-SCRIPT.md) · [`final-year-project/DEMO-ACCOUNTS.md`](./final-year-project/DEMO-ACCOUNTS.md)

---

## 1. Big picture (production)

```text
Camera / Upload / Webcam
        ↓
   YOLO + OCR (AI)
        ↓
  Violation Rule Engine
        ↓
  Officer reviews (human-in-the-loop)
        ↓
   Confirm → Issue Fine
        ↓
  Driver notified (portal + email)
        ↓
   Driver pays  OR  appeals
        ↓
  Admin reports / audit / backup
```

### Three portals in production

| Who | URL (production) | Job |
|-----|------------------|-----|
| Admin | `https://admin.<domain>` | Setup, users, cameras, AI, reports |
| Officer | `https://app.<domain>/officer` | Detect, review, issue fines |
| Driver | `https://app.<domain>/citizen` | See fines, pay, appeal |

**Stack:** Nginx + Django API + PostgreSQL + Redis + Celery + YOLO weights.

---

## 2. Full production workflow (by role)

### 2.1 Admin — system setup (before daily ops)

```text
Bootstrap admin account
  → Create officers & drivers (RBAC)
  → Register cameras & roads
  → Load sign catalog + violation rules
  → Deploy AI weights (best.pt)
  → Monitor health, audit logs, reports, backup
```

Admin does **not** issue fines. Admin **governs** the system.

### 2.2 Officer — daily enforcement (core workflow)

```text
Login as Officer
  ↓
Open Live Camera  OR  AI Detection (upload / webcam)
  ↓
POST /api/ai/detect/  (or process-frame)
  ↓
AI pipeline:
  Vehicle detect → Sign detect → Plate detect → OCR → Rule engine
  ↓
AIDetectionLog (+ optional draft violation)
  ↓
Officer reviews evidence
  ↓
Approve → create/confirm Violation
  ↓
Issue Fine (amount, driver/plate)
  ↓
Evidence saved + driver notified
```

**Important production rule:**  
`AI_PIPELINE_AUTO_CREATE_VIOLATION=False` — AI suggests; **officer confirms**. Automation assists, does not replace judgment.

### 2.3 Driver — citizen self-service

```text
Login as Driver
  ↓
Dashboard → My Violations / My Fines
  ↓
Open fine + evidence (photo, sign, plate, time)
  ↓
Choose:
  A) Pay (Stripe / ABA KHQR / manual proof)
  B) Submit Appeal
  ↓
Status updates → notifications
```

Driver only sees **their own** vehicles/fines.

### 2.4 End-to-end example (one real case)

```text
Camera/upload sees motorcycle near “No Entry” / Speed Limit
  → YOLO detects sign + vehicle
  → OCR reads plate e.g. 2A-3456
  → Rule engine suggests violation type
  → Officer confirms + issues fine
  → Driver gets notification
  → Driver pays or appeals
  → Admin exports monthly PDF/Excel report
```

---

## 3. AI pipeline (core engine)

```text
Image / camera frame
  ↓
Vehicle Detection        (YOLO)
  ↓
Traffic Sign Detection   (YOLO)
  ↓
License Plate Detection  (YOLO plate classes)
  ↓
OCR Recognition          (EasyOCR on plate crop)
  ↓
Violation Rule Engine
  ↓
Return result + AIDetectionLog
  ↓
Officer confirm → Violation → Fine → Notification
```

### Key API endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Upload detection | POST | `/api/ai/detect/` |
| Process camera frame | POST | `/api/ai/process-frame/` |
| OCR only | POST | `/api/ocr/recognize/` |
| Detection history | GET | `/api/ai/detections/` |

### AI model story (say clearly in demo)

| Use | Weight | Note |
|-----|--------|------|
| Live / production demo | `ai/weights/best.pt` | Full Cambodian sign model (live default) |
| Thesis evaluation metric | `ai/weights/best_v2.pt` | 10-class · mAP@50 ≈ **0.908** |

Canonical explanation: [`docs/AI-MODEL-STORY.md`](./AI-MODEL-STORY.md)

---

## 4. Full system demo (7 scenes · ~12 minutes)

Use this walkthrough for defense or production showcase.

| Scene | Who | What you show | Time |
|------:|-----|---------------|------|
| 1 | Admin | Login → dashboard KPIs → bilingual toggle | 1 min |
| 2 | Admin/Officer | Cameras live grid → Run AI on snapshot | 2 min |
| 3 | Officer | Upload/webcam AI Detection → sign + plate OCR | 2 min |
| 4 | System | Violation created (pending) + evidence | 2 min |
| 5 | Officer | Confirm case → Issue Fine → PDF | 2 min |
| 6 | Driver | See fine → Pay (demo/live) → optional Appeal | 2 min |
| 7 | Admin | Reports PDF/Excel + mention mAP@50 = 0.908 | 1 min |

### Local demo URLs (development)

| Surface | URL |
|---------|-----|
| Admin | http://localhost:5174 → `/admin` |
| Officer | http://localhost:5173 → `/officer` |
| Driver | http://localhost:5173 → `/citizen` |
| API | http://localhost:8000/api/ |

### Local demo accounts (thesis / E2E only — never use in public production)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@camtraffic.demo` | `CamTraffic@2026!` |
| Officer | `officer@camtraffic.demo` | `CamTraffic@2026!` |
| Driver | `driver@camtraffic.demo` | `CamTraffic@2026!` |

Full setup: [`docs/final-year-project/DEMO-ACCOUNTS.md`](./final-year-project/DEMO-ACCOUNTS.md)

### Pre-demo checklist

```bash
npm run setup:env
npm run seed:demo
# Backend
cd src/backend && python manage.py runserver
# Frontends (from repo root)
npm run dev
```

- Confirm AI weights: `AI_MODEL_PATH` points to `ai/weights/best.pt`
- Confirm `AI_USE_MOCK=False` for real detection
- Test images: `ai/test_samples/real/` or `ai/test_samples/demo_*.png`
- Fallback: pre-recorded video per `FINAL-DEMO-VIDEO-PACKAGE.md`

---

## 5. Scene-by-scene speaker notes

### Scene 1 — Admin login & dashboard (1 min)

1. Open admin portal → log in as administrator  
2. Show dashboard KPI widgets  
3. Highlight live camera status  
4. Toggle Khmer / English  

**Say:** *"Administrators govern the system—users, RBAC, cameras, AI models, and audit—not case decisions."*

### Scene 2 — Camera monitoring (2 min)

1. Open **Cameras** → live frame grid  
2. Point out online/offline health  
3. Select a camera → **Run AI detect** on snapshot  
4. Show detection overlay (sign class + confidence)  

**Say:** *"Fixed cameras feed frames into the same AI pipeline as manual uploads."*

### Scene 3 — AI detection (2 min)

1. Upload a traffic scene image **or** use webcam  
2. Show detected sign class, confidence, Khmer/English labels  
3. If vehicle visible: bounding box + plate OCR  
4. Optional: Khmer TTS for sign name  

**Say:** *"Live detection uses our Cambodian sign model. Separately, the balanced 10-class subset reached mAP@50 of 0.908 for thesis evaluation."*

### Scene 4 — Violation create (2 min)

1. Run detection on a sign that matches a violation rule  
2. Show new **Violations** record (pending)  
3. Open detail → evidence thumbnail  
4. Switch to driver → show in-app notification  

**Say:** *"The rule engine maps sign classes to prohibited actions—AI perceives, rules decide."*

### Scene 5 — Officer review & fine (2 min)

1. Log in as officer → `/officer`  
2. Open pending violation → review evidence  
3. Confirm → **Issue Fine** (lookup driver, set amount)  
4. Show fine PDF export  

**Say:** *"Officers retain final authority—automation assists, not replaces, judgment. Admins cannot issue fines."*

### Scene 6 — Driver / citizen portal (2 min)

1. Log in as driver → `/citizen`  
2. Show violation and fine on dashboard  
3. Open **Fines** → amount, due date, evidence  
4. Click **Pay Now** (demo) or start appeal  

**Say:** *"Citizens only see their own records—self-service for vehicles, fines, and appeals."*

### Scene 7 — Reports wrap-up (1 min)

1. Admin → **Reports** → export PDF  
2. Optional Excel export  
3. Mention mAP@50 = **0.908**, UAT pass, E2E tests  

**Say:** *"CamTraffic delivers detection accuracy, full enforcement workflow, and production-ready deployment."*

---

## 6. Production vs demo

| Topic | Demo / thesis | Real production |
|-------|---------------|-----------------|
| Users | Seeded demo emails | Real agency accounts only |
| Domains | localhost | `admin.` / `app.` / `api.` + HTTPS |
| AI auto-fine | May enable for demo | **Off** — officer review required |
| Payment | “Pay Now” demo record | Stripe / ABA KHQR / manual proof |
| AI model | Live `best.pt`; eval `best_v2.pt` | Deploy trained weights on server |
| Secrets | Dev `.env` | Strong `SECRET_KEY`, `DEBUG=False`, no demo seed |

Production deploy: `npm run docker:prod:up` — see [`PRODUCTION-RUNBOOK.md`](./PRODUCTION-RUNBOOK.md).

---

## 7. One-sentence defense summary

**CamTraffic production workflow:** cameras or uploads feed YOLO+OCR → rule engine suggests a violation → officer confirms and issues a fine → driver is notified and can pay or appeal → admin monitors, reports, and audits — all through three web portals on one Django API.

---

## 8. Scope reminder (for slides)

### In scope

- Web portals (Admin, Officer, Driver)
- YOLO sign detection + license plate OCR
- Violation → fine → appeal workflow
- Evidence, notifications, bilingual UI
- Reports (PDF/Excel), Docker production stack

### Out of scope

- Native mobile apps (future work)
- Full unsupervised auto-fining without officer review
- Camera hardware/firmware development
- Autonomous vehicle / drone integration

---

**Last updated:** July 24, 2026
