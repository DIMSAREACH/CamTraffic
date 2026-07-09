# CamTraffic — Final Year Project Checklist (80 Tasks)

> **Extension of the 160-task development checklist.**
> These 80 tasks cover the research, validation, and academic deliverables
> required to complete the Full Final Year Project lifecycle.

**Total**: 240 tasks (160 development + 80 FYP)
**Development tasks**: See [CHECKLIST.md](./CHECKLIST.md) — all ✅ complete

---

## Progress Summary

| Stage | Tasks | Status |
|-------|------:|:------:|
| Stage 6 — AI Research & Validation | 22 | ⬜ |
| Stage 7 — Full System Integration Test | 10 | ⬜ |
| Stage 8 — Software Testing | 14 | ⬜ |
| Stage 9 — AI Evaluation Report | 10 | ⬜ |
| Stage 10 — Production Deployment | 8 | ⬜ |
| Stage 11 — Documentation | 8 | ⬜ |
| Stage 12 — Thesis Writing | 4 | ⬜ |
| Stage 13 — Final Presentation | 4 | ⬜ |
| **TOTAL FYP** | **80** | 🎓 |

---

## Stage 6 — AI Research & Validation (Tasks 161–182)

### Dataset Collection

- [ ] Task 161 — Collect 500+ real Cambodian traffic sign images (dashcam / field photos)
- [ ] Task 162 — Collect 500+ Cambodian vehicle images (multi-angle, day/night)
- [ ] Task 163 — Collect 500+ Cambodian license plate images (various lighting conditions)
- [ ] Task 164 — Verify image quality (resolution ≥ 640×480, no blurry images)
- [ ] Task 165 — Remove duplicate images (perceptual hash dedup)
- [ ] Task 166 — Split dataset: 70% train / 20% val / 10% test per class

### Data Annotation

- [ ] Task 167 — Annotate traffic signs in Roboflow (bounding box per sign class)
- [ ] Task 168 — Annotate vehicles (car_sedan, motorcycle, truck, bus, etc.)
- [ ] Task 169 — Annotate license plates (plate bounding box + plate type class)
- [ ] Task 170 — Verify annotations (review min 20% of labels for accuracy)
- [ ] Task 171 — Export YOLO-format labels and update `training/yolo/dataset.yaml`

### AI Model Training

- [ ] Task 172 — Train YOLOv11-nano on full dataset (100+ epochs, GPU)
- [ ] Task 173 — Fine-tune with pretrained COCO weights
- [ ] Task 174 — Evaluate mAP@50 (target ≥ 0.80 overall)
- [ ] Task 175 — Evaluate Precision, Recall, F1-score per class
- [ ] Task 176 — Generate confusion matrix for all 31 classes

### OCR

- [ ] Task 177 — Crop and manually verify 500+ license plate text transcriptions
- [ ] Task 178 — Fine-tune EasyOCR on verified Cambodian plate crops
- [ ] Task 179 — Evaluate OCR: CER (target ≤ 0.15), Exact Match (target ≥ 0.85)
- [ ] Task 180 — Test OCR on edge cases (night, rain, partial occlusion)

### AI Optimization

- [ ] Task 181 — Export best YOLO weights to ONNX (FP16)
- [ ] Task 182 — Benchmark inference: FPS on GPU vs CPU; compare YOLOv11-nano vs small

---

## Stage 7 — Full System Integration Test (Tasks 183–192)

- [ ] Task 183 — Connect a real IP camera (RTSP stream) to the system
- [ ] Task 184 — Test live frame extraction from RTSP stream → process-frame API
- [ ] Task 185 — Verify AI detects traffic signs in real camera footage
- [ ] Task 186 — Verify OCR reads license plate from real camera footage
- [ ] Task 187 — Verify Detection record saved in PostgreSQL database
- [ ] Task 188 — Verify Violation auto-created when plate matches registered vehicle
- [ ] Task 189 — Verify officer receives in-app notification in real time (SSE)
- [ ] Task 190 — Verify driver receives notification and can view violation
- [ ] Task 191 — Verify report generation includes real detection data
- [ ] Task 192 — End-to-end demo run: camera → detection → violation → fine → appeal → payment

---

## Stage 8 — Software Testing (Tasks 193–206)

### Functional Testing

- [ ] Task 193 — Test Login with valid/invalid credentials (all 4 roles)
- [ ] Task 194 — Test RBAC: each role can only access permitted endpoints
- [ ] Task 195 — Test CRUD for all 16 backend apps (cameras, violations, fines, etc.)
- [ ] Task 196 — Test AI detection endpoint with various image types (JPEG, PNG, small, large)
- [ ] Task 197 — Test OCR endpoint with real plate crops
- [ ] Task 198 — Test report generation (CSV, PDF) with real data

### Performance Testing

- [ ] Task 199 — Measure API response time for 10 key endpoints (target < 200 ms)
- [ ] Task 200 — Measure AI inference speed (target < 200 ms CPU, < 30 ms GPU)
- [ ] Task 201 — Measure memory and CPU usage under load (10 concurrent users)

### Security Testing

- [ ] Task 202 — Test JWT expiry and token refresh flow
- [ ] Task 203 — Test SQL injection prevention (parameterized queries via Django ORM)
- [ ] Task 204 — Test XSS prevention (DRF content-type enforcement)
- [ ] Task 205 — Test file upload security (reject non-image MIME types)

### User Acceptance Testing

- [ ] Task 206 — Conduct UAT with 3+ real users (lecturer, officer, student) and collect feedback form

---

## Stage 9 — AI Evaluation Report (Tasks 207–216)

- [ ] Task 207 — Generate confusion matrix image for YOLO validation set
- [ ] Task 208 — Record per-class mAP@50 table (all 31 classes)
- [ ] Task 209 — Record overall mAP@50, mAP@50-95, Precision, Recall, F1
- [ ] Task 210 — Record inference time (ms/image) on CPU and GPU
- [ ] Task 211 — Record FPS (frames per second) for live inference
- [ ] Task 212 — Record OCR CER and Exact Match Rate after fine-tuning
- [ ] Task 213 — Compare YOLOv11 vs baseline (YOLOv8 or YOLOv5) if available
- [ ] Task 214 — Produce training loss curves (box loss, cls loss, mAP over epochs)
- [ ] Task 215 — Write AI evaluation chapter content (results + analysis)
- [ ] Task 216 — Save all evaluation artifacts to `ai-service/runs/evaluation/final/`

---

## Stage 10 — Production Deployment (Tasks 217–224)

- [ ] Task 217 — Provision VPS server (Ubuntu 22.04, ≥ 4 CPU, ≥ 8 GB RAM)
- [ ] Task 218 — Register domain name and configure DNS A record
- [ ] Task 219 — Obtain SSL certificate (Let's Encrypt via Certbot)
- [ ] Task 220 — Configure Nginx with HTTPS reverse proxy
- [ ] Task 221 — Deploy full stack via `docker compose -f docker-compose.prod.yml up -d`
- [ ] Task 222 — Run `migrate` and `seed_database` on production server
- [ ] Task 223 — Verify production health checks pass (all 6 services healthy)
- [ ] Task 224 — Configure automated daily database backup (`cron` + `pg_dump`)

---

## Stage 11 — Documentation (Tasks 225–232)

- [ ] Task 225 — Add Use Case Diagram (actors: admin, officer, driver, camera)
- [ ] Task 226 — Add Class Diagram for core Django models
- [ ] Task 227 — Add Sequence Diagram: violation creation flow (camera → notification)
- [ ] Task 228 — Add Deployment Diagram (server topology, Docker services, Nginx)
- [ ] Task 229 — Update API documentation with real request/response examples (curl)
- [ ] Task 230 — Update User Manual with real screenshots from the deployed system
- [ ] Task 231 — Update Installation Guide with production VPS steps
- [ ] Task 232 — Finalize Thesis Report with real AI evaluation results (replace bootstrap metrics)

---

## Stage 12 — Thesis Writing (Tasks 233–236)

- [ ] Task 233 — Write Chapter 3: Methodology (SDLC approach, data collection, tools)
- [ ] Task 234 — Write Chapter 4: System Design (use case, ER, class, sequence, architecture diagrams)
- [ ] Task 235 — Write Chapter 5: Implementation (frontend, backend, AI service screenshots + code snippets)
- [ ] Task 236 — Write Chapter 6: Testing & Evaluation (AI results, UAT results, performance benchmarks)

---

## Stage 13 — Final Presentation (Tasks 237–240)

- [ ] Task 237 — Create PowerPoint slides (20–30 slides based on `PRESENTATION-SLIDES.md` outline)
- [ ] Task 238 — Record a 5–10 min demo video of the full system (camera → fine → payment)
- [ ] Task 239 — Rehearse full defense presentation (presentation + demo + Q&A ≥ 3 times)
- [ ] Task 240 — Submit final thesis document, source code, and GitHub repository link

---

## Full FYP Demo Flow (Defense Day)

```text
Login as Admin
      ↓
Dashboard Overview
      ↓
Live Camera Frame Submitted
      ↓
AI Detects Traffic Sign (YOLOv11)
      ↓
AI Detects Vehicle
      ↓
OCR Reads License Plate (EasyOCR)
      ↓
Violation Auto-Generated
      ↓
Officer Reviews Evidence & Approves
      ↓
Driver Receives In-App Notification
      ↓
Fine Created (with reference number)
      ↓
Driver Pays Fine
      ↓
Reports & Analytics Dashboard
```

---

## Final Deliverables Checklist

### Source Code
- [x] Backend (Django REST API)
- [x] Frontend Admin Portal (React + Vite)
- [x] Frontend User Portal (React + Vite)
- [x] AI Service (FastAPI + YOLOv11 + EasyOCR)
- [x] Shared TypeScript Packages (monorepo)

### AI
- [x] Cambodian Traffic Sign Dataset (reference, bootstrap)
- [x] Cambodian Vehicle Dataset (reference)
- [x] Cambodian License Plate Dataset (reference, 453 images)
- [ ] **Full dataset** (500+ images per class, field-collected)
- [x] Bootstrap YOLOv11 model (5 epochs, CPU)
- [ ] **Production YOLOv11 model** (100+ epochs, GPU, mAP ≥ 0.80)
- [x] OCR baseline evaluation
- [ ] **Fine-tuned OCR model** (CER ≤ 0.15)
- [x] Bootstrap evaluation report
- [ ] **Final AI evaluation report** (confusion matrix, per-class mAP, FPS)

### Documentation
- [x] PRD, SRS, API docs, ER diagram
- [x] User Manual, Installation Guide, Thesis outline
- [ ] **Use Case Diagram**
- [ ] **Class Diagram**
- [ ] **Sequence Diagram**
- [ ] **Deployment Diagram**
- [ ] **Real screenshots in User Manual**
- [ ] **Final Thesis Report** (all 7 chapters complete)

### Testing
- [x] Unit tests (backend ≥ 70% coverage)
- [x] Integration tests
- [x] End-to-end pipeline validation
- [ ] **Performance test results** (measured, documented)
- [ ] **UAT with real users** (feedback collected)
- [ ] **Security test results** (documented)

### Deployment
- [x] Docker Compose (local)
- [x] Nginx config
- [ ] **VPS production deployment** (live URL)
- [ ] **HTTPS / SSL certificate**
- [ ] **Automated backup**

### Presentation
- [x] Presentation slides outline
- [x] Demo script
- [ ] **Final PowerPoint file** (20–30 slides)
- [ ] **Demo video** (5–10 min recording)
- [ ] **Thesis document** (printed + digital)
- [ ] **GitHub repository** (public, v1.0.0 tag)

---

## Recommended Priority Order

```text
Priority 1 (Do First)
  Task 161–166  — Collect and split a proper dataset
  Task 167–171  — Annotate and verify
  Task 172–176  — Train YOLOv11 on GPU (100+ epochs)

Priority 2
  Task 177–180  — Fine-tune and evaluate OCR
  Task 183–192  — Full integration test with real camera
  Task 207–216  — Write AI evaluation chapter

Priority 3
  Task 193–206  — Complete all testing categories
  Task 217–224  — Deploy to production VPS

Priority 4
  Task 225–232  — Finalize all documentation with real results
  Task 233–236  — Write all thesis chapters

Priority 5 (Final Week)
  Task 237–240  — Slides, demo video, rehearsal, submission
```
