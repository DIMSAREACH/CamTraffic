# CamTraffic — Extended Implementation & Rollout Plan

**Project Title:** Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

> **Document status:** Updated **2026-06-19** — sourced from thesis PLAN PDF and aligned with [PRD.md](PRD.md), [TASKS.md](TASKS.md), and current codebase (~53% complete).  
> **Related docs:** [SYSTEM_FLOW.md](SYSTEM_FLOW.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [API_SPEC.md](API_SPEC.md) · [TECH_STACK.md](TECH_STACK.md)

This plan transitions the CamTraffic PRD into an actionable development lifecycle covering implementation, testing, deployment, risk management, and post-launch operations.

---

## 1. Phased Project Roadmap (12-Month Timeline)

Building a high-stakes automated law enforcement system requires a staged approach to ensure public trust and system reliability.

| Phase | Duration | Key Focus Areas | Deliverables | Status |
| --- | --- | --- | --- | --- |
| **Phase 1: Foundation & Data** | Months 1–3 | Infrastructure setup, local data gathering, initial camera audits in urban areas (e.g. Phnom Penh) | Data pipelines, annotated dataset of Cambodian traffic signs and license plates, backend architecture scaffolding | ⚠️ ~75% |
| **Phase 2: Core Development** | Months 4–7 | Django REST backend, React dashboard, YOLOv8 model training | Core API endpoints, functional web interfaces, AI model achieving baseline accuracy | ⚠️ ~60% |
| **Phase 3: Pilot & Field Testing** | Months 8–9 | Closed testing with limited automated street camera network | Live stream ingestion test, unknown plate routing verification, citizen notification dry runs | ❌ ~15% |
| **Phase 4: Scale & Launch** | Months 10–12 | Public deployment, digital payment integration, municipal officer handoff | Fully operational system, public mobile/web portal, trained law enforcement staff | ❌ ~5% |

### Phase 1: Foundation & Data (Months 1–3)

**Objectives**

- Establish development environment and repository structure
- Collect and annotate Cambodian traffic sign imagery
- Audit camera infrastructure requirements in Phnom Penh urban zones
- Scaffold backend architecture (Django, PostgreSQL, RBAC)

**Activities**

- Literature review and requirement gathering → [PRD.md](PRD.md)
- Git repository + branch strategy
- Django + DRF + PostgreSQL setup
- Dual React portals (admin + user)
- Build 10-class thesis dataset (`ai/dataset_10/`)
- Camera and road registry design

**Deliverables**

- [x] PRD, ERD, API design documents
- [x] Annotated traffic sign dataset (YOLO format)
- [x] Backend scaffolding + migrations
- [ ] License plate image collection (COCO/EasyOCR path used instead)
- [ ] Camera field audit report (Phnom Penh)

**Track in:** [TASKS.md](TASKS.md) Phase 1–2, Phase 6

---

### Phase 2: Core Development (Months 4–7)

**Objectives**

- Implement full REST API per [API_SPEC.md](API_SPEC.md)
- Train and deploy YOLOv8 sign detection model (target ≥ 92% accuracy)
- Build admin, police, and driver dashboards
- Integrate violation rule engine and fine management

**Activities**

- JWT authentication + RBAC
- AI detection pipeline (OpenCV → YOLO → OCR → violations)
- Violation rule engine + evidence capture
- Fine issuance + PDF export
- Bilingual UI (Khmer + English)
- 150+ backend tests

**Deliverables**

- [x] Core API endpoints (`/api/auth/`, `/api/ai/detect/`, `/api/violations/`, `/api/fines/`)
- [x] Functional web interfaces (admin :5174, user :5173)
- [x] YOLOv8 10-class model (`ai/weights/best.pt`)
- [ ] AI model ≥ 92% mAP benchmark (formal evaluation pending)
- [ ] KYC upload workflow
- [ ] Payment receipt processing
- [ ] Appeals system

**Track in:** [TASKS.md](TASKS.md) Phase 3–8, Phase 11

---

### Phase 3: Pilot & Field Testing (Months 8–9)

**Objectives**

- Closed pilot with limited street camera network
- Validate live stream ingestion and unknown plate routing
- Dry-run citizen notifications before public launch

**Activities**

- Deploy staging environment (Docker + Nginx + Redis)
- `POST /api/v1/ingest/telemetry/` camera heartbeat testing
- `POST /api/v1/ingest/violation/` edge payload testing
- Unknown vehicle queue officer workflow
- Load testing with Locust/JMeter
- Security penetration testing
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) field rehearsal

**Deliverables**

- [ ] Live RTSP/stream ingestion verified
- [ ] Unknown plate → `unknown_vehicles` queue operational
- [ ] Email/WebSocket notification dry runs
- [ ] Pilot test report (accuracy, latency, officer feedback)
- [ ] QA sign-off document

**Track in:** [TASKS.md](TASKS.md) Phase 5, 7, 16

---

### Phase 4: Scale & Launch (Months 10–12)

**Objectives**

- Public deployment with HTTPS and high availability
- Integrate digital payment processors (ABA, Wing, etc.)
- Train municipal traffic officers on dashboard workflows
- Hand off to operations team with hypercare support

**Activities**

- Production Kubernetes/Docker Compose deployment
- SSL certificate + domain configuration
- Payment gateway or manual receipt verification go-live
- Officer training sessions
- Public citizen portal launch
- 3-month hypercare monitoring (see §5)

**Deliverables**

- [ ] Production system (99.9% uptime target)
- [ ] Public web portal live
- [ ] Payment integration operational
- [ ] Trained law enforcement staff
- [ ] User manual + officer SOP
- [ ] Thesis defense + exhibition materials

**Track in:** [TASKS.md](TASKS.md) Phase 8–10, 14–15

---

## 2. Testing & Quality Assurance (QA) Strategy

Errors in traffic enforcement can lead to legal complications and public distrust. QA is split into three rigorous verification tracks.

### 2.1. AI & Model Validation

| Test area | Requirement | Current |
| --- | --- | --- |
| **Edge cases** | Test YOLOv8 against Cambodian conditions: monsoon rain, low-light/night, obscured plates, non-standard fonts | ⚠️ Indoor/printed sign testing done; field conditions pending |
| **Confidence routing** | Flag reads with `ai_confidence_score < 75%` to `unknown_vehicles` queue — never auto-issue citations | ❌ Queue not built; live webcam uses conf ≥ 50% with 3/5 vote |
| **Accuracy benchmark** | Model must achieve ≥ 92% on validation set before production deploy | ⚠️ TS-03 evaluation scripts exist; formal report pending |
| **Hybrid fallback** | Gemini Vision for low-confidence sign verification | ✅ Optional hybrid mode |

**Tools:** `scripts/audit_detection_pipeline.py` · `python manage.py test tests.test_e2e_pipeline` · `ai/train.py` evaluation

---

### 2.2. Load & Stress Testing

| Test area | Requirement | Current |
| --- | --- | --- |
| **Camera telemetry** | Simulate high-frequency `POST /api/v1/ingest/telemetry/` from hundreds of cameras via Locust or JMeter | ❌ Ingest API not implemented |
| **Concurrent uploads** | Multi-threaded violation image ingestion without packet drops | ⚠️ Single-request upload path tested |
| **API latency** | Read endpoints < 200ms under load | ⚠️ Dev performance OK; formal load test pending |
| **Async workers** | Celery handles heavy PDF/KYC tasks without blocking API | ❌ Celery not configured |

---

### 2.3. Security & Penetration Testing

| Test area | Requirement | Current |
| --- | --- | --- |
| **JWT blacklist** | Verify logout invalidates refresh tokens; prevent session hijacking | ✅ SimpleJWT blacklist |
| **Audit trail** | Every admin override or fine dismissal logged in `audit_logs` with JSONB old/new values + IP | ❌ `audit_logs` table not implemented |
| **RBAC enforcement** | Drivers cannot access police/admin endpoints | ✅ Role checks on API + portals |
| **HTTPS** | All client interfaces over TLS | ❌ Production SSL pending |
| **DPIA compliance** | Mask plate strings in public logs; restrict PII queries | ⚠️ RBAC enforced; log masking pending |

**Track in:** [TASKS.md](TASKS.md) Phase 13, Phase 16

---

## 3. Infrastructure & Deployment Architecture

Real-time data processing and high availability use a hybrid **edge-cloud** setup.

```text
[Camera Edge Unit] ──(Pre-processing)──> [Staging / Production Cloud]
         │
    ┌────┴────┐
    ▼         ▼
[Nginx Load   [Celery Worker Queue]
 Balancing]    (Heavy Images / PDFs / KYC)
    │
    ▼
[Django REST Framework] ──> [PostgreSQL]
         │
         └──> [Redis] (cache, sessions, notification triggers)
```

### 3.1. Containerization & Orchestration

| Component | Staging | Production | Status |
| --- | --- | --- | --- |
| Django REST API | Docker Compose | Kubernetes (scaled) | ❌ Planned |
| PostgreSQL | Docker Compose | Managed PostgreSQL | ✅ Local + prod docs |
| Redis | Docker Compose | Redis cluster | ❌ Planned |
| Nginx | Reverse proxy + SSL | Load balancer | ❌ Documented only |
| Frontend | Static `dist/` via Nginx | CDN optional | ✅ Vite build |

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [TECH_STACK.md](TECH_STACK.md)

---

### 3.2. Image Optimization Pipeline

Rather than streaming raw uncompressed video to the central cloud (bandwidth drain), camera edge units perform localized processing:

1. **Frame differencing** — detect motion / vehicle presence
2. **Local YOLO inference** (optional edge deploy) — pre-filter frames
3. **Selective upload** — only frames with suspected violations or clear plates are zipped and pushed via ingestion APIs

**Current implementation:** Full-frame upload via `POST /api/ai/detect/` or browser webcam capture. Edge pipeline is Phase 3+ work.

---

### 3.3. Asynchronous Processing

Heavy tasks offloaded to Celery background workers to keep API response times below **200ms**:

| Task | Worker queue | Status |
| --- | --- | --- |
| KYC document processing (license/ID upload) | `kyc` | ❌ |
| Fine PDF receipt generation | `reports` | ⚠️ Sync ReportLab today |
| Bulk violation export (Excel/PDF) | `reports` | ⚠️ Sync openpyxl today |
| Email/SMS notification dispatch | `notifications` | ❌ |
| AI model evaluation after deploy | `ai` | ❌ |

---

## 4. Risk Management & Mitigation Matrix

**Operational standard:** System design must prioritize **false-negative routing** over **false-positive automated fine generation** to maintain legal integrity.

| Risk Event | Impact | Probability | Mitigation Strategy | Impl. |
| --- | --- | --- | --- | --- |
| **Network interruption** — camera loses cloud connectivity | High | Medium | Local edge storage buffers on camera units; cache violations locally; bulk retry upload when connection restored | ❌ |
| **High false-positive fines** — AI misidentifies objects or misreads plates | High | Low | Mandatory human-in-the-loop validation for first 6 months; fines stay **Pending Review** until traffic officer verifies | ⚠️ Rule engine + officer confirm/reject UI |
| **Data privacy leak** — unencrypted owner/location data exposed | Critical | Low | Strict RBAC; mask plate strings in public logs; HTTPS on all clients; purge raw video after 30 days if no violation | ⚠️ RBAC done; masking/purge pending |
| **System abuse** — unauthorized internal modification/deletion of fines | High | Low | Block manual SQL overrides; all state changes via DRF API; immutable `audit_logs` records user, timestamp, IP | ❌ Audit logs pending |

### Additional risks (thesis prototype)

| Risk | Mitigation | Status |
| --- | --- | --- |
| AI detection inaccuracies | Improve dataset, retrain model, confidence thresholds | ⚠️ 10-class model + vote gates |
| Hardware/GPU limitations | CPU inference mode; model warmup on server start | ✅ |
| Camera connectivity issues | Error handling + snapshot poll fallback | ⚠️ |
| Database performance | Indexing on plate, status, role fields | ✅ |

---

## 5. Post-Launch Maintenance & Hypercare

Following public deployment, a **3-month Hypercare** period monitors system health.

### 5.1. Daily Metric Audits

Monitor the ratio of **automatic AI detections vs. manual officer overrides** to continuously tune YOLOv8 confidence thresholds.

| Metric | Target action |
| --- | --- |
| Override rate > 20% | Raise `AI_LIVE_YOLO_INFER_CONF` or retrain on failure cases |
| Unknown plate queue growing | Review OCR pipeline; add officer staffing |
| API p95 latency > 200ms | Scale Celery workers; add Redis cache |

---

### 5.2. Feedback Loops

Review citizen dispute statistics from the `violation_appeals` system to pinpoint:

- Intersections with repetitive errors (bad camera angles)
- Camera nodes affected by lighting interference
- Sign classes with lowest detection confidence

**Actions:** Adjust camera placement · re-annotate training data · update violation rules

---

### 5.3. Hypercare Checklist

- [ ] Daily dashboard review (violations, fines, appeals, unknown queue)
- [ ] Weekly model confidence report
- [ ] Weekly officer feedback session
- [ ] Monthly security audit log review
- [ ] Monthly dataset refresh for YOLO retraining

---

## 6. Thesis Development Timeline (Parallel Track)

For academic submission, the project also follows a **25-week thesis schedule** (can overlap with Phases 1–2 above):

| Phase | Duration | Focus | Status |
| --- | --- | --- | --- |
| Research & Requirement Analysis | 2 weeks | Literature review, PRD | ✅ |
| System Design | 2 weeks | Architecture, ERD, API, UI | ✅ |
| Environment Setup | 1 week | Django, React, PostgreSQL, Git | ✅ |
| AI Detection Module | 4 weeks | YOLO, OpenCV, dataset, training | ✅ |
| Backend Development | 4 weeks | Models, APIs, auth, violations, fines | ✅ |
| Frontend Development | 4 weeks | Dashboards, AI detection page | ✅ |
| System Integration | 2 weeks | Full pipeline E2E | ✅ |
| Testing & Debugging | 2 weeks | Unit, integration, AI accuracy | ⚠️ In progress |
| Deployment & Security | 1 week | Nginx, HTTPS | ❌ |
| Documentation & Thesis | 3 weeks | Chapters 4–5, slides, defense | ⚠️ Drafts exist |

**Total:** ~25 weeks

---

## 7. Development Tools

| Category | Tools |
| --- | --- |
| Backend | Django 4.2, Django REST Framework, SimpleJWT |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4, Axios |
| Database | PostgreSQL (SQLite dev) |
| AI / CV | YOLOv8 (Ultralytics), OpenCV, EasyOCR, ByteTrack |
| Caching / Queue | Redis, Celery (planned) |
| Containerization | Docker, Docker Compose (planned), Kubernetes (production) |
| Load testing | Locust, JMeter (planned) |
| Version control | Git, GitHub |
| Deployment | Nginx, Gunicorn, Certbot SSL |
| Design | Draw.io, Figma |

---

## 8. Success Criteria

The project succeeds when:

| Criterion | Target | Current |
| --- | --- | --- |
| Traffic signs detected accurately | ≥ 92% mAP | ⚠️ Evaluation pending |
| Violations identified and logged | Auto + officer review | ✅ Rule engine + UI |
| Live camera feeds processed | RTSP + edge ingest | ⚠️ Webcam + snapshot only |
| Dashboards functional | Admin, police, driver | ✅ |
| Data securely stored | RBAC + HTTPS + audit | ⚠️ RBAC done |
| Unknown plates routed safely | No auto-fine below 75% conf | ❌ Queue pending |
| Citizens can pay and appeal | Digital payment + appeals | ❌ Pending |
| Officers trained and operational | SOP + hypercare | ❌ Post-launch |

---

## 9. Final Deliverables

| Deliverable | Status |
| --- | --- |
| AI Traffic Sign Detection System (YOLOv8) | ✅ |
| Traffic Law Enforcement Platform | ⚠️ |
| Web Dashboard (admin + user portals) | ✅ |
| PostgreSQL Database | ✅ |
| REST API | ✅ |
| Docker production deployment | ❌ |
| User manual | ❌ |
| Thesis documentation (Ch 3–5) | ⚠️ Drafts |
| Presentation slides + demo script | ✅ |
| Source code repository | ✅ |

---

## 10. Document Index

| File | Purpose |
| --- | --- |
| [PLAN.md](PLAN.md) | This document — implementation & rollout plan |
| [PRD.md](PRD.md) | Product requirements |
| [TASKS.md](TASKS.md) | Phase 1–16 development checklist |
| [SYSTEM_FLOW.md](SYSTEM_FLOW.md) | End-to-end workflows |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database schema (PRD + implementation) |
| [API_SPEC.md](API_SPEC.md) | REST API specification |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Defense demonstration script |

---

## 11. Conclusion

This plan provides a structured 12-month roadmap — from foundation and core development through pilot testing, public launch, and hypercare — for CamTraffic. The thesis prototype (~53% of full PRD scope) already delivers working sign detection, violation evaluation, fine management, and bilingual dashboards. Remaining work focuses on field pilot infrastructure (ingest APIs, unknown plate queue), payment/appeals workflows, production deployment (Docker, Redis, Celery, HTTPS), and the QA/security hardening required before municipal rollout.
