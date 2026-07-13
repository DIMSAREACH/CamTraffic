# CamTraffic — Glossary

**Version:** 1.0 · **Date:** July 2026 · **Task:** 379

---

## A

**AIDetectionLog** — Database record of each AI inference run, including detected sign class, confidence, image reference, and user who triggered detection.

**ANPR (Automatic Number Plate Recognition)** — Technology to read vehicle license plates from images; implemented via OCR in CamTraffic.

**Appeal** — Formal request by a driver to contest a fine; reviewed by traffic police or admin.

**API (Application Programming Interface)** — REST endpoints under `/api/` used by frontend portals.

---

## B

**Bounding box** — Rectangle coordinates around a detected object (sign or vehicle) in an image.

**Backup** — ZIP export of database + media + config; available via admin dashboard or PostgreSQL dump scripts.

---

## C

**Camera** — Registered traffic camera with frame source URL, linked to a road segment.

**Celery** — Distributed task queue for async jobs (email, scheduled cleanup) using Redis as broker.

**Confidence score** — Model probability (0–1) that a detection is correct; displayed in UI.

**CORS (Cross-Origin Resource Sharing)** — Browser security policy; backend whitelists frontend origins.

---

## D

**Detection pipeline** — End-to-end flow: image in → YOLO sign detection → vehicle/plate OCR → violation rule evaluation → records out.

**Driver** — User role for vehicle owners who view fines and submit appeals.

**Docker Compose** — Tool orchestrating multi-container production stack (8 services).

---

## E

**ER diagram (Entity-Relationship)** — Visual map of database tables and relationships; see `docs/DATABASE.md`.

**Evidence** — Image or metadata attached to a violation record for audit.

**Expert system** — Rule-based component mapping detected sign classes to prohibited actions and default fines.

---

## F

**Fine** — Monetary penalty issued to a driver for a confirmed traffic violation.

**Frame URL** — HTTP/RTSP address from which a camera snapshot is fetched.

---

## G

**Gunicorn** — Python WSGI HTTP server running Django in production.

**GTSRB** — German Traffic Sign Recognition Benchmark; reference dataset in literature.

---

## I

**Inference** — Running a trained model on new image data to produce predictions.

**i18n (Internationalization)** — Support for English and Khmer (ខ្មែរ) UI strings.

---

## J

**JWT (JSON Web Token)** — Access + refresh token pair for authenticated API requests.

---

## K

**Khmer TTS** — Text-to-speech for reading sign names in Khmer via `/api/ai/tts/`.

---

## M

**mAP (mean Average Precision)** — Primary object detection metric; CamTraffic 10-class model ≈ 0.908 @ IoU 0.5.

**Mock mode** — `AI_USE_MOCK=True` returns synthetic detection data without loading YOLO weights.

---

## N

**Notification** — In-app alert for fine issued, appeal decision, or system message.

---

## O

**OCR (Optical Character Recognition)** — Reading license plate text from cropped vehicle images.

**Officer** — Traffic police user who runs detection and issues fines.

---

## P

**Plate number** — Vehicle registration identifier; used to link violations to drivers.

**PostgreSQL** — Production relational database (SQLite used in quick dev).

---

## R

**RBAC (Role-Based Access Control)** — Permission system with roles assignable to users.

**RTSP** — Real Time Streaming Protocol; common for IP camera feeds.

**Redis** — In-memory store for cache and Celery message broker.

---

## S

**Sign catalog** — Registry of Cambodian traffic signs with codes, Khmer/English names, categories.

**Sign class key** — YOLO class identifier (e.g., `stop_sign`) linking detection to violation rules.

**SRS (Software Requirements Specification)** — Document defining functional and non-functional requirements (`docs/SRS.md`).

---

## T

**Traffic violation** — Record of a detected infraction with status workflow (pending → confirmed/dismissed).

**TTS (Text-to-Speech)** — Audio output of sign labels for accessibility.

---

## U

**UAT (User Acceptance Testing)** — Role-based scenario testing documented in `docs/final-year-project/UAT-REPORT.md`.

**UUID** — Universally unique identifier used as primary key for most production tables.

---

## V

**Violation rule** — Mapping from sign class + observed action to violation type and default fine amount.

**Vite** — Frontend build tool and dev server for React portals.

---

## Y

**YOLO (You Only Look Once)** — Real-time object detection architecture; CamTraffic uses YOLOv8 for 10 traffic sign classes.

**YOLO label format** — Normalized `class x_center y_center width height` annotation files for training.

---

## Abbreviations quick reference

| Term | Expansion |
|------|-----------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CV | Computer Vision |
| DB | Database |
| E2E | End-to-end (testing) |
| ER | Entity-Relationship |
| ITS | Intelligent Transportation System |
| KPI | Key Performance Indicator |
| PRD | Product Requirements Document |
| REST | Representational State Transfer |
| SDLC | Software Development Life Cycle |
| SLA | Service Level Agreement |
| SPA | Single Page Application |
| SSL/TLS | Secure Sockets Layer / Transport Layer Security |
| VPS | Virtual Private Server |
