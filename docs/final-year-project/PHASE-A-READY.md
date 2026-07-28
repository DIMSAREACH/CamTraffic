# Phase A — Defense Ready (executed 2026-07-23)

Status checklist for thesis demo readiness.

---

## A1 — 248-class model load ✅

- [x] `AI_MODEL_PATH` → `ai/weights/best.pt`
- [x] Backend restarted
- [x] Log confirms: **`Loaded sign YOLO: 248 classes`**
- [x] `.env` reload fixed (`load_dotenv(..., override=True)`)

---

## A2 — Demo seed ✅

```bash
npm run seed:demo
```

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Admin | `admin@camtraffic.demo` | `CamTraffic@2026!` | http://localhost:5174 → `/admin` |
| Officer | `officer@camtraffic.demo` | `CamTraffic@2026!` | http://localhost:5173 → `/officer` |
| Driver | `driver@camtraffic.demo` | `CamTraffic@2026!` | http://localhost:5173 → `/citizen` |

Verified API login for all three roles (200 OK).

---

## A3 — Services running

| Service | URL | Status |
|---------|-----|--------|
| API health | http://127.0.0.1:8000/health/ | ✅ 200 |
| Backend | http://127.0.0.1:8000 | ✅ 248-class YOLO |
| User portal | http://127.0.0.1:5173 | ✅ (port in use) |
| Admin portal | http://127.0.0.1:5174 | ✅ (port in use) |

---

## A4 — Test images ready ✅

Folder: `ai/test_samples/`

| File | Use for |
|------|---------|
| `demo_stop.png` | Stop |
| `demo_no_entry.png` | No Entry |
| `demo_speed_50.png` | Speed 50 |
| `demo_no_parking.png` | No Parking |
| `demo_pedestrian.png` | Pedestrian crossing |

**Tip:** Prefer real signs in `ai/test_samples/real/` (Phase B1). Hard/dark frames: `ai/test_samples/hard/` (B4). See `PHASE-B1-REAL-PHOTOS.md` and `PHASE-B2-PLUS.md`.

---

## A5 — Your practice (you do this)

Follow `docs/final-year-project/DEMO-SCRIPT.md` — run **5 times**:

1. Admin login → AI Detection → upload `ai/test_samples/real/03_no_entry.png` or `01_stop.png`
2. Officer → Detection Queue → approve
3. Fine issued → Driver login → see fine
4. Driver pay (KHQR) → Officer verify payment
5. Driver appeal (optional)

---

## A6 — Backup video (you record)

1. Screen-record one clean DEMO-SCRIPT pass (3–5 min)
2. Save to USB + laptop
3. See `docs/final-year-project/FINAL-DEMO-VIDEO-PACKAGE.md`

---

## AI one-liner (memorize)

> Live model = **248 Cambodian signs** (`best.pt`).  
> Thesis accuracy mAP@50 = **0.908** is for the balanced **10-class** eval (`best_v2.pt`) only.

Full story: `docs/AI-MODEL-STORY.md`

---

## Quick start tomorrow

```bash
cd src/backend
python manage.py runserver

# other terminal (repo root)
npm run dev
```

Then open portals and log in with accounts above.
