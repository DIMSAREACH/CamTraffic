# TASK.MD

## Project Title

**Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

> **Scope note:** The system covers **12 major modules** (OpenCV, YOLO, Vehicle Detection, Monitoring, Violations, OCR, Evidence, Dashboard, Mobile, Database, API, Testing) — not traffic sign detection alone. Progress synced from codebase on **2026-06-06**. `[x]` = implemented · `[ ]` = not yet done (includes partial work).

---

# SYSTEM ARCHITECTURE (FULL STACK)

```text
Traffic Camera
      ↓
OpenCV (Frame Capture & ROI)
      ↓
YOLOv8 ( Vehicle DSign +etection)
      ↓
OCR (License Plate Recognition)
      ↓
Violation Detection (Rule Engine)
      ↓
Evidence Capture
      ↓
PostgreSQL Database
      ↓
Django REST API
      ↓
React Dashboard  +  Mobile App (Officer Alerts)
```

---

# BUILD ORDER — STEP BY STEP

Follow this sequence to build the system from foundation to defense demo.


| Step   | Phase          | Module                                         | Why this order                    |
| ------ | -------------- | ---------------------------------------------- | --------------------------------- |
| **1**  | Foundation     | Project Setup + PostgreSQL + Django + React    | Everything depends on this        |
| **2**  | Data Layer     | Module 10 — PostgreSQL Database                | Models before APIs and AI logs    |
| **3**  | Backend Core   | Module 9 — Django REST APIs (auth first)       | Frontend and AI need endpoints    |
| **4**  | Vision Input   | Module 1 — OpenCV Image & Video Processing     | Camera frames feed all AI         |
| **5**  | AI Core        | Module 2 — YOLO Traffic Sign Detection         | Primary thesis innovation         |
| **6**  | AI Extension   | Module 3 — Vehicle Detection & Tracking        | Multi-object pipeline             |
| **7**  | Enforcement    | Module 4 — Automated Traffic Law Enforcement   | Rules need sign + vehicle context |
| **8**  | Identification | Module 5 — Cambodian License Plate OCR         | Links violations to vehicles      |
| **9**  | Records        | Module 6 — Digital Record Management           | Persist evidence and violations   |
| **10** | Monitoring     | Module 3 (Real-Time) — Live camera + analytics | Uses steps 4–9                    |
| **11** | UI             | Module 7 — Web Dashboard                       | Displays full pipeline            |
| **12** | Mobile         | Module 8 — Mobile Application                  | Optional for defense              |
| **13** | Quality        | Module 11 — Testing                            | Validate before documentation     |
| **14** | Thesis         | Module 12 — Thesis Documentation               | Chapters 3–5 + defense            |


### Defense demo flow (Priority 1 — must demonstrate)

```text
Camera
  → OpenCV Frame Capture
  → YOLO Sign Detection
  → Vehicle Detection
  → OCR Plate Recognition
  → Violation Detection
  → Evidence Capture
  → Save to PostgreSQL
  → Display on React Dashboard
```

---

# MODULE 0: PROJECT SETUP

## Objective

Initialize the full-stack development environment.

### Environment Setup

- Create Django Project
- Create React Project (Vite) — admin + user portals
- Configure PostgreSQL Database
- Configure Tailwind CSS
- Configure Django REST Framework
- Configure JWT Authentication
- Create Git Repository
- Create Project Structure
- Configure `.env` and secrets (`.env.example` provided)

---

# MODULE 1: OPENCV IMAGE & VIDEO PROCESSING

## Objective

Develop the image processing and video analysis layer for real-time traffic monitoring and AI detection.

### Camera Integration

- Install OpenCV (`opencv-python-headless` in requirements)
- Configure Webcam (browser `getUserMedia` — `useWebcamDetection.ts`, `LiveWebcamPanel.tsx`)
- Configure IP Camera / CCTV snapshot URL (`Camera.frame_source_url`, `CamerasPage.tsx`)
- Configure RTSP / server-side `cv2.VideoCapture` stream
- Configure Video File Input (server-side)
- Capture Real-Time Frames (webcam + snapshot polling)

### Image Processing

- Image Resize (PIL/NumPy in `ai_detection/services.py`)
- Image Cropping / center ROI (`SIGN_REGION_FRACTION`, `sign_image_processing.py`)
- Noise Reduction
- Gaussian Blur
- Contrast Enhancement
- Brightness Adjustment
- Image Sharpening

### Video Processing

- Frame Extraction (webcam canvas capture)
- Real-Time Frame Processing (hybrid detect on each frame)
- Server-side Video Stream Handling
- FPS Monitoring
- Video Recording

### ROI (Region of Interest)

- Create Traffic Sign ROI (center-crop fraction)
- Create Traffic Light ROI (configurable zone)
- Create Stop Line ROI
- Create No Parking Zone ROI
- Create Restricted Area ROI
- Create Vehicle Detection Zone

### Evidence Capture

- Capture Violation Screenshot (webcam frame → upload)
- Save Detection Image (`AIDetectionLog.uploaded_image`)
- Capture Vehicle Snapshot (auto-crop from detection)
- Capture License Plate Snapshot
- Save Violation Video Clip
- Save Timestamp
- Save Camera Information (optional `location` on detect)
- Save GPS Location

### Annotation System

- Draw Bounding Boxes (YOLO internal; thesis export scripts)
- Draw Detection Labels on live UI overlay
- Draw Confidence Scores on live UI
- Draw Tracking IDs
- Draw Violation Alerts on stream

### Traffic Monitoring

- Vehicle Counting Line
- Direction Detection
- Lane Monitoring
- Traffic Density Analysis
- Congestion Analysis

### OpenCV Integration Testing

- Camera Testing (webcam + snapshot URL)
- Video File Testing
- ROI Zone Testing
- Evidence Capture Pipeline Testing

---

# MODULE 2: AI TRAFFIC SIGN DETECTION (YOLOv8)

## Objective

Detect and classify Cambodian traffic signs and traffic lights.

### Dataset Preparation

- Collect Cambodian Traffic Sign Images (`data/traffic_signs/`)
- Label Traffic Signs (YOLO format via `build_dataset.py`)
- Organize Dataset (`ai/data.yaml`)
- Prepare Metadata (`sign_catalog.json`, `reference_sign_meta.json`)

### YOLOv8 Development

- Configure YOLOv8 (`ai/train.py`)
- Train Traffic Sign Model (`best.pt`, AI-06 evidence)
- Export Trained Model
- Optimize Detection Accuracy (TS-03 evaluation)

### Detection

- Detect Traffic Signs (`_yolo_detect` in `services.py`)
- Detect Traffic Lights (YOLO class)
- Classify Sign Categories (catalog mapping)
- Retrieve Sign Information (DB + catalog)
- Display Sign Meaning (AI Detection page + TTS)

### Hybrid Detection

- YOLO Detection (primary)
- Gemini Vision Fallback (`gemini_service.py`)
- Unknown Sign Recognition (low-confidence → Gemini)
- Detection History Storage (`AIDetectionLog`, AI Logs page)

### Innovation

- Real-Time Traffic Sign Detection
- High FPS Processing (browser-side frame loop)
- Automatic Sign Classification

---

# MODULE 3: VEHICLE DETECTION & TRACKING + REAL-TIME MONITORING

## Objective

Detect and track vehicles; analyze live traffic streams from cameras.

### Vehicle Detection

- [x] Detect Cars (YOLOv8 COCO `yolov8n.pt` — `vehicle_detection.py`)
- [x] Detect Motorcycles
- [ ] Detect Tuk-Tuks *(COCO has no tuk-tuk class — needs custom training)*
- [x] Detect Trucks
- [x] Detect Buses

### Vehicle Tracking

- Integrate ByteTrack
- Assign Vehicle IDs
- Track Vehicle Movement
- Track Vehicle Direction
- Store Tracking Logs

### Vehicle Analytics

- Vehicle Counting
- Daily Statistics (CV-based)
- Weekly Statistics
- Monthly Statistics
- Traffic Density Analysis
- Congestion Analysis (Low / Medium / High / Critical)

### Real-Time Traffic Monitoring

- Connect Camera Streams (`infrastructure` app, `CamerasPage`)
- Capture Frames (snapshot + webcam)
- Process Video Streams (frame-by-frame AI on webcam/snapshot)
- Display Live Monitoring (AI Detection + Cameras pages)
- Detect Real-Time Events (sign detect + optional violation evaluate)
- Generate Traffic Statistics (dashboard API — detections, fines, violations)

### Innovation

- Real-Time Traffic Monitoring (partial — polling + webcam)
- Live Vehicle Analytics
- Smart Traffic Observation (density + congestion)

---

# MODULE 4: AUTOMATED TRAFFIC LAW ENFORCEMENT

## Objective

Automatically identify traffic violations and generate enforcement records.

### Violation Rules

- No Left Turn (`ViolationRule` + `evaluate_violation`)
- No Right Turn
- No U-Turn
- No Parking
- Road Closed
- Stop Sign Violation
- Red Light Violation
- Speed Limit Violation
- Weight Limit Violation

### Rule Engine

- Violation Logic (`violations/services.py`)
- ROI Validation (spatial zones on camera frame)
- Vehicle Action Analysis (`observed_action` on detect API)
- Automatic Violation Generation (`create_violation` flag)

### Evidence Management

- Capture Evidence (uploaded image on detect / fine)
- Save Evidence (`TrafficViolation.evidence_image`, `Fine.evidence_image`)
- Link Evidence to Violation (`ai_detection_log` FK)
- Generate Violation Record (evaluate + create API)

### Innovation

- Automated Traffic Law Enforcement (rule engine + API)
- Millisecond-Level Violation Detection
- Automatic Evidence Generation (full auto pipeline)

---

# MODULE 5: CAMBODIAN LICENSE PLATE RECOGNITION (OCR)

## Objective

Recognize Cambodian vehicle license plates.

### Plate Detection

- Detect License Plate
- Crop Plate Region
- Enhance Plate Image

### OCR Processing

- Integrate EasyOCR
- Integrate PaddleOCR
- Khmer Character Recognition
- English Character Recognition
- Number Recognition

### Cambodian Localization

- Private Plate Recognition
- Government Plate Recognition
- Police Plate Recognition
- Military Plate Recognition
- Special Plate Recognition

### Record Linking

- Manual Plate Entry (`Vehicle.plate_number`, fine lookup)
- Search by Plate (`GET /api/vehicles/search/?plate=`)
- Link OCR Result to Vehicle (automatic)
- Link OCR Result to Violation (automatic)
- Save OCR History

### Innovation

- Khmer-English Plate Recognition
- Cambodian ANPR System

---

# MODULE 6: DIGITAL RECORD MANAGEMENT

## Objective

Store and manage digital violation records and evidence.

### Evidence Storage

- Detection Images (`AIDetectionLog`)
- Violation Images (`TrafficViolation.evidence_image`)
- Fine Evidence (`Fine.evidence_image`)
- Video Evidence
- OCR Results (dedicated store)

### Data Management

- Vehicle Records (`vehicles` app)
- Driver Records (`Driver` model)
- Violation Records (`violations` app)
- Fine Records (`fines` app)

### Search System

- Search by Plate Number (vehicles + fines lookup)
- Search by Violation Type (violations list filter)
- Search by Date (list filters)
- Search by Location (unified evidence search)
- Dedicated Evidence Archive module

### Innovation

- Digital Record Management (partial — scattered image fields)
- Smart Evidence Storage (central evidence table + search)

---

# MODULE 7: WEB DASHBOARD (REACT + TAILWIND)

## Objective

Centralized monitoring platform for administrators and traffic police.

### Authentication

- Login
- Logout
- Register
- OAuth (Google)
- Password Reset
- Role Management (`User.role`: admin / police / driver)
- Permission Management (RBAC models; API uses role-based access)

### Dashboard

- Overview Statistics (admin / police / driver dashboards)
- Active Cameras (infrastructure + Cameras page)
- Vehicle Statistics
- Violation Statistics (charts on admin dashboard)
- Total Detections

### Monitoring

- Live Camera Stream (webcam + snapshot URL)
- Real-Time Detection (AI Detection page)
- Real-Time Alerts (in-app notifications on detect)
- Detection Bounding Box Overlay on live stream

### Management

- User Management
- Vehicle Management
- Violation Management (`ViolationsPage`)
- Fine Management (`FineManagement`)
- Traffic Sign Management (`TrafficSignsPage`)
- Camera Management (`CamerasPage`)

### Reporting

- Reports Page (dashboard API charts)
- Fine PDF Export (`GET /api/fines/{id}/pdf/`)
- Daily Report (scheduled export)
- Weekly Report
- Monthly Report
- Export PDF (full analytics report)

---

# MODULE 8: MOBILE APPLICATION

## Objective

Provide real-time alerts to officers in the field.

### Authentication

- Login (responsive user portal)
- Logout

### Notification System

- In-App Notifications (`notifications` app)
- Firebase Cloud Messaging
- Push Notification Service

### Alerts

- Receive Violation Alerts (in-app)
- Receive Vehicle Information (push)
- Receive Plate Information (push)
- Receive Evidence Images (push)

### Officer Actions

- View Violation (police dashboard + violations)
- View Evidence (violation / fine detail)
- Issue Fines (police dashboard)
- Mark Case Processed (dedicated workflow)

### Innovation

- Mobile-Based Traffic Enforcement (native app)
- Responsive Web for Officers (partial)

---

# MODULE 9: BACKEND DEVELOPMENT (DJANGO)

## Objective

Expose all system features through REST APIs.

### APIs

- Authentication API (`/api/auth/`)
- User API (`/api/users/`)
- Vehicle API (`/api/vehicles/`)
- OCR API
- Traffic Sign API (`/api/signs/`)
- AI Detection API (`/api/ai/detect/`, `/api/ai/logs/`, `/api/ai/stats/`)
- Violation API (`/api/violations/`, evaluate, stats, rules)
- Fine API (`/api/fines/`, PDF)
- Dashboard API (`/api/dashboard/`)
- Notification API (`/api/notifications/`)
- Infrastructure API (`/api/cameras/`, `/api/roads/`)
- TTS API (`/api/ai/tts/`)

---

# MODULE 10: POSTGRESQL DATABASE

## Objective

Persist all domain entities per ERD design.

### Tables

- Users (`User`, `Officer`, `Driver`)
- Roles (RBAC `Role` model + `User.role`)
- Permissions (`Permission`, `RolePermission`)
- Officers
- Drivers
- Vehicles
- Cameras
- Roads
- Traffic Signals (`TrafficSignal`)
- Traffic Signs
- Violations (`ViolationRule`, `TrafficViolation`)
- Fines
- AI Detection Logs (detection history)
- Notifications
- Evidence Files (dedicated table)
- Vehicle Tracking Logs
- OCR Results

---

# MODULE 11: TESTING

## Objective

Validate AI accuracy and system reliability before defense.

### AI Testing

- Traffic Sign Detection Accuracy (TS-03, `evaluate_sign_accuracy`)
- Vehicle Detection Accuracy
- OCR Accuracy
- Violation Detection Accuracy (`test_violations.py`)
- Hybrid YOLO + Gemini (`test_hybrid_detection.py`, `test_gemini_service.py`)

### System Testing

- API Testing (`test_api.py` — auth, profile, infrastructure)
- Dashboard Testing (E2E)
- Mobile Testing
- Database Testing (migrations + API CRUD)

### Field Testing

- Camera Testing (webcam + snapshot)
- Traffic Sign Testing (live + CLI `test_sign_detect`)
- OCR Testing
- Violation Testing (evaluate API + auto on detect)

### Integration Testing

- Camera → Detection (webcam / upload)
- Detection → Database (AI logs)
- Database → Dashboard (stats API)
- Full pipeline: Camera → YOLO → Vehicle → OCR → Violation → Evidence → Dashboard

---

# MODULE 12: THESIS DOCUMENTATION

## Objective

Complete thesis chapters and defense materials.

### Chapter 3 — System Analysis & Design

- System Analysis
- Methodology
- Architecture Design
- Database Design (ERD)
- Use Case Diagram
- Activity Diagram
- System Flowchart

### Chapter 4 — Implementation

- OpenCV Implementation
- AI Implementation (YOLO + Gemini hybrid)
- OCR Implementation
- Violation Engine Implementation
- Dashboard Implementation
- Mobile Application Implementation
- API Implementation

### Chapter 5 — Results & Conclusion

- Testing Results (TS-03, AI-06 evidence)
- Accuracy Analysis
- Discussion
- Conclusion
- Future Work

### Defense Preparation

- Presentation Slides
- Demo Script (full pipeline)
- Demo Signs Prepared (No Left/Right Turn, No U-Turn, No Parking, Road Closed, Weight Limit)

---

# DEFENSE PRIORITY (2 WEEKS LEFT)

### Priority 1 — Must Have (defense demo)


| #   | Item                          | Status                                                    |
| --- | ----------------------------- | --------------------------------------------------------- |
| 1   | OpenCV Camera Streaming       | Partial — webcam + snapshot; finish server stream if time |
| 2   | YOLO Traffic Sign Detection   | Done                                                      |
| 3   | Vehicle Detection             | Partial — COCO on `/api/ai/detect/`                       |
| 4   | OCR License Plate Recognition | Partial — EasyOCR on `/api/ai/detect/` + UI               |
| 5   | Violation Detection           | Done (rule engine + API + UI)                             |
| 6   | Evidence Capture              | Done — frame + vehicle + plate crops auto-saved           |
| 7   | PostgreSQL Database           | Done                                                      |
| 8   | Django APIs                   | Done                                                      |
| 9   | React Dashboard               | Done (core features)                                      |
| 10  | Detection History             | Done                                                      |
| 11  | Testing & Documentation       | Partial — tests done; docs not started                    |


### Priority 2 — Nice to Have

- Vehicle Tracking (ByteTrack)
- Mobile App (native + FCM)
- Push Notifications
- Fine Management
- Traffic Density Analytics
- In-App Notifications

### Priority 3 — Future Work

- Speed Detection
- Multi-Camera Network
- Smart City Integration
- Predictive Traffic Analytics
- Red Light / Stop Sign ROI violations
- Dedicated Evidence Archive

---

# PROGRESS SUMMARY


| Module                  | Done     | Total    | %        | Notes                                         |
| ----------------------- | -------- | -------- | -------- | --------------------------------------------- |
| 0. Project Setup        | 9        | 9        | 100%     | Complete                                      |
| 1. OpenCV               | 14       | 38       | 37%      | Browser/PIL ROI; no server cv2 pipeline       |
| 2. AI Sign Detection    | 22       | 22       | 100%     | YOLO + Gemini hybrid complete                 |
| 3. Vehicle + Monitoring | 14       | 28       | 50%      | COCO vehicle detect done; tracking pending    |
| 4. Law Enforcement      | 14       | 20       | 70%      | Rules done; ROI + auto evidence pending       |
| 5. OCR / ANPR           | 10       | 18       | 56%      | EasyOCR + plate fields on detect API          |
| 6. Digital Records      | 10       | 16       | 63%      | No central evidence module                    |
| 7. Web Dashboard        | 24       | 28       | 86%      | Core complete; PDF reports partial            |
| 8. Mobile App           | 6        | 14       | 43%      | Responsive web only; no native/FCM            |
| 9. Django APIs          | 12       | 12       | 100%     | OCR wired into detect API                     |
| 10. PostgreSQL          | 14       | 17       | 82%      | Tracking + evidence tables missing            |
| 11. Testing             | 12       | 16       | 75%      | Plate OCR unit tests added; E2E pending       |
| 12. Documentation       | 0        | 18       | 0%       | Not started                                   |
| **Overall**             | **~158** | **~236** | **~67%** | Full detect pipeline wired; evidence crop next  |


---

# FINAL SYSTEM FEATURES


| Feature                         | Status                                                  |
| ------------------------------- | ------------------------------------------------------- |
| OpenCV Camera Integration       | Partial (browser webcam + PIL; no server OpenCV stream) |
| YOLOv8 Traffic Sign Detection   | Done                                                    |
| Gemini Vision Fallback          | Done *(set `GEMINI_API_KEY` in `.env`)*                 |
| Hybrid AI Detection System      | Done                                                    |
| Cambodian Traffic Sign Database | Done                                                    |
| Real-Time Camera Monitoring     | Partial (webcam + snapshot polling)                     |
| Vehicle Detection               | Partial (COCO YOLO on detect API + dashboard UI)        |
| Vehicle Tracking (ByteTrack)    | Not started                                             |
| Vehicle Counting & Density      | Not started                                             |
| OCR / Khmer Plate Recognition   | Partial (EasyOCR Latin plates on detect API)            |
| Traffic Law Enforcement         | Partial (rules + API + UI; no spatial ROI)              |
| Evidence Image Capture          | Done — frame + vehicle + plate crops on detect/violation  |
| Digital Record Management       | Partial                                                 |
| Detection History               | Done                                                    |
| Dashboard Analytics             | Partial                                                 |
| Fine Management                 | Done                                                    |
| In-App Notifications            | Done                                                    |
| Mobile App (Native + Push)      | Not started                                             |
| Django REST API                 | Mostly done                                             |
| PostgreSQL Database             | Done (core tables)                                      |
| React + Tailwind Frontend       | Done                                                    |
| Thesis Documentation            | Not started                                             |


---

# NEXT STEPS (RECOMMENDED BUILD SEQUENCE)

Use this checklist for the remaining **2 weeks before defense**:

1. **[x] Vehicle Detection** — COCO/YOLO vehicle model wired to `/api/ai/detect/`
2. **[x] OCR Module** — EasyOCR on detect API; Cambodia Latin plates (e.g. 2A-1234) + vehicle link
3. **[x] Wire full demo pipeline** — Camera → Sign → Vehicle → OCR → Violation → Evidence → DB → Dashboard
4. **[x] Evidence auto-capture** — Auto-save full frame + vehicle crop + plate crop on detect/violation
5. **[x] Live overlay** — Bounding boxes for sign, vehicle, and plate on webcam stream
6. **[ ] Integration test** — One end-to-end pytest or manual test script for defense *(NEXT)*
7. **[ ] Chapter 4 + 5** — Document implementation and TS-03 / AI-06 results
8. **[ ] Defense slides + demo script** — Practice full pipeline live

Optional if time allows: ByteTrack tracking, FCM mobile push, traffic density analytics.