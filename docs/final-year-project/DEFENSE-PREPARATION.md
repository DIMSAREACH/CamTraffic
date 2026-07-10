# Project Defense Preparation

**Task 160 — Final Year Project**
**Date**: 2026-07

---

## 1. Defense Structure

| Section | Duration |
|---------|---------|
| Presentation | 15–20 min |
| System Demonstration | 5–10 min |
| Q&A | 10–15 min |
| **Total** | **~45 min** |

---

## 2. Presentation Delivery Tips

- Open with the **problem** (traffic enforcement challenges in Cambodia) before the solution.
- Explain the AI pipeline **visually** — use Diagram 2 from `ARCHITECTURE-DIAGRAMS.md`.
- Be honest about bootstrap AI results — "5 epochs on CPU is a proof-of-concept baseline; production requires GPU training."
- Highlight the **license plate detection accuracy (mAP@50 = 0.993)** as a strong concrete result.
- End with clear **future work** — demonstrates research awareness.

---

## 3. Anticipated Defense Questions & Suggested Answers

### On AI & Model Quality

**Q: Your mAP@50 is only 0.424. Is that good enough for production?**

> "No — this is a bootstrap baseline from 5 training epochs on a CPU with 552 training images. For production, we target mAP@50 ≥ 0.80, which requires GPU training with 100+ epochs on a curated dataset of 10,000+ images. The license plate detection class already achieves 0.993 mAP@50 with 453 images, which demonstrates the approach scales well with data."

**Q: Why did you choose YOLOv11 instead of Faster R-CNN or SSD?**

> "YOLOv11 provides single-pass inference (~62 ms on CPU), making it suitable for real-time traffic monitoring. Faster R-CNN achieves higher accuracy but at 5–10× higher latency, which is unacceptable for live enforcement scenarios. YOLO's active development community and built-in export tools (ONNX, TensorRT) also simplify deployment."

**Q: How does EasyOCR perform on Cambodian plates?**

> "The current baseline uses EasyOCR pretrained for Latin-script plates, achieving a CER of 0.663. This is a starting point — after manual QC of transcriptions and fine-tuning on verified Cambodian plate images, we expect CER ≤ 0.15 and exact match ≥ 0.85. Khmer-script plates would require a custom recognition model."

**Q: Why not use a cloud OCR API (Google Vision, AWS Rekognition)?**

> "Cloud APIs require constant internet connectivity and per-call costs, which is not feasible for police stations with limited connectivity. An on-premise OCR solution is essential for offline operation."

---

### On System Architecture

**Q: Why did you split into a separate AI service instead of putting everything in Django?**

> "Separating the AI service (FastAPI) from the business logic (Django) enables independent scaling, independent deployment, and clean separation of concerns. When more cameras are added, we can scale AI workers horizontally without touching the Django backend. It also allows different hardware for different services — GPU for AI, CPU for Django."

**Q: How does the system handle camera frame processing without blocking the API?**

> "The Django backend uses Celery with Redis as the message broker. When a frame is submitted, the API immediately returns 202 Accepted and dispatches a Celery background task. The task calls the AI service, persists the result, and notifies officers — all asynchronously. Officers receive notifications via SSE (Server-Sent Events) without polling."

**Q: How is security handled?**

> "All API endpoints are protected by JWT (JSON Web Tokens) with 60-minute access tokens and 7-day refresh tokens. Role-Based Access Control (RBAC) enforces four roles: super_admin, admin, officer, and driver. Each role has strictly scoped API access. Passwords are hashed with Argon2. All authentication events are logged in the audit trail."

---

### On Database & Data

**Q: How many database tables does the system have?**

> "25+ tables across 18 Django apps, covering: users, roles, permissions, police stations, officers, drivers, vehicles, cameras, traffic signs, AI models, detections, OCR results, violations, fines, payments, appeals, notifications, audit logs, and system settings."

**Q: How does the violation auto-creation work?**

> "When the AI pipeline processes a camera frame, if EasyOCR reads a plate number, the backend performs a lookup in the `vehicles_vehicle` table by `plate_number` (unique indexed field). If a matching vehicle is found, a `Violation` record is automatically created with status `pending`, linked to the detection, vehicle, and driver. An officer then reviews and approves or rejects the violation."

---

### On Testing & Quality

**Q: How did you test the system?**

> "The system has three testing layers: (1) Unit tests for Django models and views using pytest (~70% coverage); (2) Integration tests validating end-to-end API flows (auth → violation workflow); (3) Security tests for RBAC authorization and rate limiting. The AI integration pipeline has a dedicated validation script (`validate_integration.py`) that smoke-tests all service connections."

**Q: How would you scale this system to 100 cameras?**

> "The async Celery architecture scales horizontally — add more workers to process more frames in parallel. The AI service can be deployed on a GPU node with multiple uvicorn workers. PostgreSQL can be given a read replica for reporting queries. Redis can be clustered for HA. The bottleneck with 100 cameras would be GPU inference throughput, which can be addressed with a GPU node or distributed inference queue."

---

### On Project Management

**Q: How did you manage a 160-task project alone?**

> "I organized the project into structured phases with an enterprise checklist in `docs/CHECKLIST-MASTER.md`. Each phase had clear deliverables and was tracked as a git commit. I used a monorepo (Turborepo) to keep all services in sync and shared packages to avoid duplication."

---

## 4. Live Demo Preparation

1. Start all services: `docker compose up -d`
2. Open two browser windows: Admin Portal + Driver Portal
3. Have the `demo-frame.jpg` image ready to submit
4. Keep a terminal open with admin JWT token pre-copied
5. Have the Architecture Diagrams markdown open as backup if demo fails

---

## 5. Day-of Checklist

- [ ] Laptop charged + power adapter
- [ ] Presentation file (PowerPoint/PDF backup)
- [ ] Docker services tested and running
- [ ] Demo credentials written on paper (fallback)
- [ ] GitHub repository accessible
- [ ] Printed thesis copies (if required)
- [ ] Drink water — stay calm
