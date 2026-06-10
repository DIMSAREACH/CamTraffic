# CamTraffic — Defense Demo Script

**Thesis:** Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Time needed:** ~10 minutes for full live demo  
**URL:** `http://localhost:5174` (admin portal)

---

## Pre-Demo Checklist (do this before the defense starts)

```bash
# Terminal 1 — Django backend
cd backend
python manage.py runserver

# Terminal 2 — Admin frontend  
cd frontend-admin
npm run dev
```

Confirm both are running:
- Backend: http://127.0.0.1:8000 → should get `{"detail":"Authentication credentials were not provided."}`
- Frontend: http://localhost:5174 → login page loads

---

## Demo Flow (in this exact order)

### Step 1 — Login & Dashboard (1 min)

1. Open `http://localhost:5174`
2. Login with admin credentials
3. **Show:** Dashboard loads instantly with stats — total detections, users, violations, fines
4. **Say:** *"The admin dashboard aggregates real-time data from PostgreSQL via the Django REST API."*

---

### Step 2 — Camera Feed & Live Sign Detection (3 min)

1. Click **"AI Detection"** in the sidebar
2. Click **"Start Camera"** — webcam activates
3. Hold up a traffic sign (physical or printed): No Left Turn, No Parking, or No U-Turn
4. **Show:** Detection result appears with:
   - Sign name in Khmer and English
   - Confidence score (e.g., 87%)
   - Sign image from the database
   - Khmer TTS audio plays automatically
5. **Say:** *"YOLOv8 trained on 285 Cambodian traffic signs detects the sign in real-time. A Gemini Vision fallback handles unknown signs."*

**Backup:** If webcam doesn't work, use **Upload Image** with a photo from `ai/test_samples/`.

---

### Step 3 — Full Pipeline Demo (3 min)

1. Still on AI Detection page → click **"Upload Image"**
2. Upload `ai/test_samples/car_with_plate_2A-1234.jpg`
3. **Show the pipeline steps panel:**
   - ✅ Image received
   - ✅ Vehicle detected (Car, confidence %)
   - ✅ Plate region found
   - ✅ OCR result: `2A-1234`
   - ✅ Violation check
   - ✅ Evidence frame saved
   - ✅ Record saved as Log #X
4. **Say:** *"The full pipeline runs in under 3 seconds: sign detection → vehicle detection → license plate OCR → violation engine → evidence capture → database persistence."*

---

### Step 4 — Violation Management (1 min)

1. Click **"Violations"** in the sidebar
2. **Show:** Violation records with type, status, evidence image
3. Click one violation → show detail with linked evidence
4. **Say:** *"Violations are automatically generated when the rule engine matches a detected sign with a prohibited driver action."*

---

### Step 5 — Fine Management & PDF Export (1 min)

1. Click **"Fine Management"** in the sidebar
2. **Show:** Fine records with driver name, amount, status
3. Click a fine → click **"Download PDF"** button
4. **Show:** PDF receipt downloads with fine details
5. **Say:** *"Officers can issue digital fines linked to violations. Drivers receive in-app notifications and can download PDF receipts."*

---

### Step 6 — AI Accuracy Results (1 min)

1. Click **"Traffic Signs"** in the sidebar
2. **Show:** 285 Cambodian traffic signs with images and categories
3. **Then switch to:** Detection Logs page
4. **Show:** Average confidence ~80-90%, total scan count
5. **Say:** *"The model was evaluated on TS-03 test set: 92.2% mAP50 across 24 sign classes, documented in the thesis evidence folder."*

---

### Step 7 — Run Integration Tests (optional, 30 sec)

Open a terminal during Q&A and run:
```bash
cd backend
python manage.py test tests.test_e2e_pipeline -v 1
```
All 19 tests should pass in ~15 seconds.

---

## Key Numbers to Memorize

| Metric | Value |
|--------|-------|
| Sign classes trained | 24 classes |
| Training images | ~2,000+ |
| Best mAP50 | 92.2% (camtraffic_signs3) |
| Detection speed | < 3 sec per frame (CPU) |
| API endpoints | 19 fully working |
| Backend framework | Django 6.0 + DRF |
| AI model | YOLOv8n (Ultralytics) |
| Fallback AI | Google Gemini 2.5 Flash |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 19 + Vite + Tailwind |

---

## Common Questions & Answers

**Q: Why SQLite instead of PostgreSQL?**  
A: SQLite is used for development/demo with WAL mode enabled for concurrency. The system is configured to switch to PostgreSQL in production via `USE_SQLITE=False` in `.env`.

**Q: How accurate is the OCR for Cambodian plates?**  
A: Currently supports Latin-script plates (e.g., `2A-1234`). Khmer-script plates are a future work item — EasyOCR is integrated and extensible.

**Q: What happens when YOLO confidence is too low?**  
A: The system falls back to Google Gemini Vision API for hybrid detection. If both fail, it returns an "Unknown Sign" result.

**Q: How does violation detection work automatically?**  
A: A rule engine maps (detected sign + observed action) pairs to violation types. E.g., detecting `NO_LEFT_TURN` while `observed_action=LEFT_TURN` auto-generates a `ILLEGAL_LEFT_TURN` violation record.

**Q: Is this real-time?**  
A: Yes — the webcam captures frames every ~500ms, uploads to the Django API, YOLO runs inference, and results stream back to the browser live. End-to-end latency is under 3 seconds on CPU.

---

## Emergency Backup Plan

If the live demo fails:
1. Show the thesis evidence screenshots in `docs/thesis_evidence/AI-06/`
2. Run the integration test suite: `python manage.py test tests.test_e2e_pipeline`
3. Show the training metrics: `docs/thesis_evidence/AI-06/training/results.png`
