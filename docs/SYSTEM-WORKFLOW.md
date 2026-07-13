# How Your Entire System Works

## AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

Think of CamTraffic as **five connected systems** working together:

```text
                 ┌────────────────────────────┐
                 │      Admin Portal          │
                 │   frontend-admin (:5174)   │
                 └─────────────┬──────────────┘
                               │
                 ┌─────────────▼──────────────┐
                 │        Backend API         │
                 │   Django REST API (:8000)  │
                 │   + AI pipeline (embedded) │
                 └─────────────┬──────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   PostgreSQL Database    AI Service          Notification
   (violations, fines)    YOLOv11 + EasyOCR   Email / in-app
                          ai/weights/
```

| Layer | Repo path | Role |
|-------|-----------|------|
| Admin portal | `frontend-admin/` | System setup, users, AI ops, reports |
| User portal | `frontend-user/` | Officer + driver daily workflows |
| Backend API | `backend/` | Business logic, auth, enforcement |
| AI pipeline | `backend/ai_detection/` + `ai/` | Detection, OCR, training artifacts |
| Database | PostgreSQL / SQLite | All enforcement records |

The system has **three main users**:

| User | Portal | Primary job |
|------|--------|-------------|
| Admin | Admin portal | Configure system, train AI, manage master data |
| Officer | User portal (police role) | Run detection, review violations, issue fines |
| Driver | User portal (driver role) | View violations, pay fines, submit appeals |

---

## 1. Admin Workflow

The admin manages the whole system.

```text
Login  →  Dashboard  →  Modules (sidebar)
```

### Admin dashboard modules

```text
Dashboard
│
├── Users / Roles          → Task031–033
├── Officers / Drivers     → Task034–035
├── Vehicles               → Task036
├── Traffic Signs          → Task038–039
├── Cameras / Roads        → Task040
├── AI Models              → Task042
├── Dataset                → Task043 (scripts today; admin UI partial)
├── AI Training            → Task060 (scripts + history panel)
├── AI Detection           → Task071
├── Violations / Fines     → Task044–046
├── Appeals                → Task047
├── Reports / Analytics    → Task111–120
├── Notifications          → Task048
├── Audit Logs             → Task051
└── System Settings        → Task052
```

**Typical admin journey**

```text
Admin
  ↓
Dataset (ai/dataset/, ai/scripts/)
  ↓
Upload / organize images + YOLO labels
  ↓
Train model (ai/training/yolo/train_v2.py)
  ↓
Evaluate (ai/evaluation/run_phase10.py)
  ↓
Deploy weights → ai/weights/best_v2.pt, best_combined.pt
  ↓
Register version in DB (AIModelVersion)
  ↓
AI Detection endpoints use new weights
```

**Code references:** `frontend-admin/admin/pages/`, `shared/pages/AIModelsPage.tsx`, `ai/training/`, `backend/ai_models/`

---

## 2. AI Training Workflow

Only the **admin** trains AI. Training is **not** used on every detection — it produces the model files that detection loads at runtime.

```text
Dataset
  ↓
Preprocessing (split, validate, augment)
  ↓
YOLOv11 Training (Ultralytics)
  ↓
Validation / cross-validation
  ↓
Evaluation (mAP, per-class metrics)
  ↓
Save model weights
  ↓
Deploy to backend/ai_detection/
```

### Production model artifacts (this repo)

| Purpose | Weight file | Notes |
|---------|-------------|-------|
| Traffic signs (10-class demo) | `ai/weights/best_v2.pt` | mAP@50 ≈ 0.908 |
| Vehicle + license plate (combined) | `ai/weights/best_combined.pt` | 31-class combined run |
| OCR | EasyOCR runtime | Fine-tune guide: `docs/training/OCR-FINETUNING-GUIDE.md` |
| ONNX export (optional) | `ai/models/exports/` | Deployment optimization |

Training scripts: `ai/training/yolo/train.py`, `train_v2.py`  
Evaluation: `docs/training/PHASE-09-TRAINING.md`, `docs/training/PHASE-10-EVALUATION.md`

---

## 3. Officer Workflow

The officer uses the **user portal** with the **police** role.

```text
Officer Login
  ↓
Dashboard (PoliceDashboard)
  ↓
Live Camera  OR  AI Detection (upload / webcam)
```

### Detection request flow

```text
Image / camera frame
  ↓
POST /api/ai/detect/  or  POST /api/ai/process-frame/
  ↓
backend/ai_detection/pipeline.py
  ↓
YOLOv11 + EasyOCR + violation rules
  ↓
JSON result → frontend
```

### AI service steps (single pipeline)

```text
Image
  ↓
Vehicle Detection        (YOLO combined model)
  ↓
Traffic Sign Detection   (YOLO signs model)
  ↓
License Plate Detection  (YOLO plate classes)
  ↓
OCR Recognition          (EasyOCR on plate crop)
  ↓
Violation Rule Engine    (pipeline_enforcement.py)
  ↓
Return result + optional DB log (AIDetectionLog)
```

### Example API result (simplified)

```json
{
  "vehicles": [{ "class": "motorcycle", "confidence": 0.97 }],
  "sign": { "code": "P_SPEED_40", "label": "Speed Limit 40", "confidence": 0.98 },
  "plate": { "text": "2A-3456", "confidence": 0.94 },
  "violation_suggestion": { "type": "speed_limit_exceeded", "confidence": 0.98 }
}
```

### Officer review

```text
Review detection on AI Detection / Violations page
  ↓
Approve  or  Reject
  ↓
If approved:
  Create / confirm Violation
  ↓
  Create Fine (if applicable)
  ↓
  Save evidence attachment
  ↓
  Notify driver (Celery + in-app notification)
```

**Code references:** `frontend-user/user/pages/dashboard/PoliceDashboard.tsx`, `shared/pages/AIDetectionPage.tsx`, `shared/pages/ViolationsPage.tsx`, `backend/violations/`, `backend/fines/`, `backend/notifications/`

---

## 4. Driver Workflow

The driver uses the **user portal** with the **driver** role.

```text
Login
  ↓
Dashboard (DriverDashboard)
```

### Driver modules

```text
My Vehicles
My Violations
My Fines / Payment
Evidence
Appeals
Notifications
Settings
Payment History
```

### Violation detail flow

```text
Open violation
  ↓
View evidence (image, plate, sign, timestamp)
  ↓
View fine amount and status
  ↓
Choose:
  Pay Fine          → FineManagement (driver pay flow)
  or
  Submit Appeal     → AppealsPage
```

**Code references:** `frontend-user/user/pages/driver/`, `shared/pages/FineManagement.tsx`, `shared/pages/AppealsPage.tsx`

---

## 5. AI Detection Workflow (Core Engine)

This is the **heart** of the system — used by officers daily.

```text
Upload Image / Live Frame
  ↓
AI Service (backend/ai_detection/)
  ↓
YOLOv11 inference
  ↓
Detect Vehicles
  ↓
Detect Traffic Signs
  ↓
Detect License Plates
  ↓
OCR (EasyOCR)
  ↓
Violation Rule Engine (ViolationRule + evaluate_violation)
  ↓
Save AIDetectionLog (+ optional Violation draft)
  ↓
Return JSON to frontend
```

### End-to-end detection example

**Input:** road image with motorcycle near a speed-limit sign

```text
Image
  ↓
AI detects:
  • Vehicle: Motorcycle
  • Sign: Speed Limit 40
  • Plate: 2A-3456 (OCR confirms 2A-3456)
  ↓
Violation engine:
  • Rule: speed limit 40 km/h
  • Observed speed (if available) or demo rule match
  • Suggested violation: Speeding
  ↓
Officer: Approve
  ↓
Database: Violation + Fine + Evidence
  ↓
Driver: Notification in portal (+ email if configured)
```

**Key endpoints**

| Action | Method | Endpoint |
|--------|--------|----------|
| Upload detection | POST | `/api/ai/detect/` |
| Process camera frame | POST | `/api/ai/process-frame/` |
| OCR only | POST | `/api/ocr/recognize/` |
| Detection history | GET | `/api/ai/detections/` |

---

## AI Training vs AI Detection

Many students confuse these two. CamTraffic separates them clearly:

| | AI Training | AI Detection |
|---|-------------|--------------|
| **Purpose** | Teach / improve the model | Use the trained model on new images |
| **Who** | Admin only | Officer (daily operations) |
| **Frequency** | Occasional (when dataset improves) | Every enforcement action |
| **Input** | Labeled dataset (YOLO format) | Live image or camera frame |
| **Output** | `.pt` weight files | JSON detections + violations |
| **Location** | `ai/training/`, `ai/runs/` | `backend/ai_detection/` |

```text
TRAINING (offline)                DETECTION (online)
Dataset → Train → best_v2.pt  →   Image → Predict → Result
```

---

## Database Flow

All portals follow the same pattern:

```text
Frontend (React)
  ↓  HTTPS + JWT
Backend (Django REST)
  ↓  ORM
PostgreSQL
  ↓  JSON response
Frontend renders UI
```

### Example: officer approves violation

```text
Officer clicks Approve
  ↓
PATCH /api/violations/<id>/  (status update)
  ↓
Backend validates RBAC (police role)
  ↓
INSERT/UPDATE Violation record
  ↓
CREATE Fine record (if not exists)
  ↓
LINK evidence file to violation
  ↓
QUEUE notification (Celery task or sync fallback)
  ↓
RETURN { success: true, violation, fine }
  ↓
Driver portal shows new notification
```

**Core tables:** `users`, `vehicles`, `traffic_signs`, `infrastructure_camera`, `ai_detection_aidetectionlog`, `violations_violation`, `fines_fine`, `appeals_appeal`, `notifications_notification`

See `docs/DATABASE.md` and `docs/SCHEMA.sql`.

---

## Complete Enterprise Workflow

```text
                         ADMIN
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Users            Dataset / Scripts    AI Models
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                      AI Training
                           │
                    Train YOLOv11 (ai/training/)
                           │
                   Deploy weights (ai/weights/)
                           │
              AI Service (backend/ai_detection/)
                           │
              ┌────────────┴────────────┐
              │                         │
           Officer                   Cameras
              │                         │
      Upload / Webcam            Live stream (RTSP/HTTP)
              │                         │
              └────────────┬────────────┘
                           │
                    AI Detection
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Vehicle           Traffic Sign        License Plate
   Detection          Detection            Detection
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    OCR Recognition
                           │
                 Violation Rule Engine
                           │
               Officer Reviews Result
                           │
                  Approve / Reject
                           │
                   Generate Fine
                           │
                    Save Database
                           │
                  Notify Driver
                           │
                    Driver Portal
                           │
            View Evidence / Pay Fine / Appeal
                           │
                  Reports & Analytics
                  (dashboard auto-update)
```

---

## Overall System Flow (Summary)

1. **Admin** sets up the system — users, signs, cameras, datasets, trains AI models, and deploys the best weights.
2. **Officer** uses the deployed model on uploaded images, webcam captures, or live camera frames, then reviews and confirms violations.
3. **Backend** stores the confirmed violation, creates a fine when applicable, attaches evidence, and triggers notifications.
4. **Driver** logs in to view violations, evidence, and fines — then pays or submits an appeal.
5. **Reports and analytics** read from the same database and update dashboards automatically.

This workflow mirrors a real intelligent traffic enforcement platform while staying practical for a final-year project using **Django**, **React**, **YOLOv11**, **EasyOCR**, and **PostgreSQL**.

---

## Related Documents

| Document | Content |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture and stack |
| [ARCHITECTURE-DIAGRAMS.md](./ARCHITECTURE-DIAGRAMS.md) | UML use case, sequence, ER diagrams |
| [USER-MANUAL.md](./USER-MANUAL.md) | Step-by-step portal usage |
| [CHECKLIST.md](./CHECKLIST.md) | 150 development tasks (Task001–Task150) |
| [DEMO-SCRIPT.md](./final-year-project/DEMO-SCRIPT.md) | Live defense demo scenes |
| [backend/docs/API.md](../backend/docs/API.md) | REST API catalog |

---

*Updated: 2026-07-13 — aligned with actual repo layout and endpoints.*
