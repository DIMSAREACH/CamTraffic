# CamTraffic — Defense Preparation (Q&A)

**Task 410** · Final Year Project Viva  
**Date:** 2026-07-12

---

## 1. Elevator pitch (30 seconds)

CamTraffic is an AI-based traffic sign detection and enforcement platform for Cambodia. It uses YOLO11n to detect 10 Cambodian sign classes, maps detections to violation rules, and connects officers and drivers through web portals for fines and appeals. The production model achieves mAP@50 of 0.908 at ~20 FPS on CPU.

---

## 2. Anticipated questions & answers

### Project scope & motivation

**Q: Why Cambodia? Why traffic signs specifically?**  
A: Cambodia's growing road network relies on sign compliance, but manual enforcement cannot scale. Signs are visually standardized and detectable with CV—a practical first step before full ANPR deployment. The system uses local sign taxonomy and Khmer UI.

**Q: How is this different from a generic YOLO demo?**  
A: CamTraffic is end-to-end: detection → violation rules → fines → appeals → notifications → audit logs → production Docker deployment. It is not inference-only.

**Q: Who are the stakeholders?**  
A: System administrators, traffic police officers, and drivers—each with dedicated portal workflows documented in role manuals.

---

### AI & machine learning

**Q: Why YOLO and not Faster R-CNN?**  
A: YOLO offers real-time single-stage inference suitable for officer upload and webcam workflows. We achieved 0.908 mAP@50 with YOLO11n at ~20 FPS CPU—meeting accuracy and speed targets.

**Q: Why only 10 classes in production?**  
A: The full taxonomy has 31 sign classes with 2,840+ collected images. A balanced 10-class subset was trained first for reliable thesis demonstration. Expansion to 31 classes is documented future work.

**Q: Your recall is 0.196—isn't that low?**  
A: Yes, and we state this as a limitation. Precision is 0.96, so confirmed detections are trustworthy. Officer-in-the-loop review compensates for missed signs. Improving recall requires more balanced training data per class.

**Q: How does OCR work? Why 0% exact match?**  
A: EasyOCR reads plate text from vehicle crops. Without Cambodia-specific fine-tuning, character error rate is ~2.4 with no exact matches on our test set. Officers use license lookup API for confirmation.

**Q: How do you prevent false violations?**  
A: ViolationRule engine requires sign class match + configured prohibited action. Fines require officer confirmation. Auto-create is optional and off by default for conservative deployment.

---

### System design & architecture

**Q: Why modular monolith instead of microservices?**  
A: Thesis scope and team size favor a single Django codebase with embedded AI. Production can isolate ai-worker via Docker without splitting into many services. Simpler to develop, test, and deploy for a final-year project.

**Q: How do you handle security?**  
A: JWT authentication, RBAC permissions, audit logging, MIME-validated uploads, ORM-only queries (SQL injection tested), TLS in production, CORS whitelist.

**Q: What database do you use?**  
A: SQLite for development; PostgreSQL 16 in production Docker stack. UUID primary keys on core entities.

---

### Testing & evaluation

**Q: How did you test the system?**  
A: Unit/API tests, RBAC security tests, Playwright E2E (4 scenarios), manual UAT across three roles, performance benchmarks, and AI metric evaluation from training artifacts.

**Q: Did real users test it?**  
A: UAT followed structured role-based scenarios simulating admin, officer, and driver workflows. A field pilot with traffic police is recommended future work.

---

### Deployment & operations

**Q: Can this run in production today?**  
A: The Docker Compose stack (8 services) is production-ready for pilot deployment. OCR accuracy and 10-class coverage should be improved before national-scale rollout.

**Q: What about GPU?**  
A: CPU inference works for upload workflows. Multi-camera live RTSP processing needs GPU ai-worker pool—documented in deployment diagram.

---

### Limitations & ethics

**Q: What are the main limitations?**  
A: 10-class model, low OCR exact-match, web-only interface, demo payment, limited night/rain training data, recall gap.

**Q: Privacy concerns with plate storage?**  
A: Plate text and evidence images are access-controlled by role. Drivers see only their records. Production requires data retention policy aligned with Cambodian privacy law—a recommendation in Chapter 7.

**Q: Could AI wrongly fine drivers?**  
A: Officer confirmation is required before fine issuance in the demo workflow. Appeals workflow allows drivers to contest. Auto-fine is configurable and should remain off in pilot phase.

---

### Thesis & process

**Q: What SDLC did you follow?**  
A: 19-phase enterprise checklist (540 tasks)—waterfall foundation plus agile feature iterations. 446 tasks completed to date.

**Q: What would you do differently?**  
A: Collect more balanced per-class images earlier; fine-tune OCR on Cambodian plates from the start; run mock defenses sooner.

---

## 3. Technical deep-dive cards

Keep these numbers ready:

| Metric | Value |
|--------|------:|
| mAP@50 | 0.908 |
| mAP@50-95 | 0.796 |
| CPU FPS | ~20 |
| API routes | ~120 |
| Django apps | 16 |
| Docker services | 8 |
| E2E tests | 4/4 PASS |
| Sign classes (production) | 10 |
| Sign taxonomy (full) | 31 |
| Collection target (road) | 8,848 frames |

---

## 4. Demo recovery lines

| Situation | Say |
|-----------|-----|
| AI slow | "Inference takes 1–3 seconds on CPU—I have screenshots as backup." |
| Login fails | "Let me use the pre-seeded admin account—credentials were verified in yesterday's dry-run." |
| Blank camera | "This camera uses a static demo frame—the pipeline is identical for live RTSP in production." |

---

## 5. Questions to ask the panel (optional)

- "Would the faculty recommend pilot partnership with local traffic police?"
- "Should the thesis expand Chapter 6 with a field evaluation if time permits before final binding?"

---

## 6. Materials to have open

| Tab / file | Purpose |
|------------|---------|
| Admin portal :5174 | Live demo |
| User portal :5173 | Officer + driver demo |
| `PRESENTATION-SLIDES.md` | Speaker notes |
| `ai/runs/detect/dataset_10_train/PR_curve.png` | Backup slide |
| GitHub repo | Code reference |

---

## 7. Rehearsal targets

| Skill | Target |
|-------|--------|
| Presentation | 15 min ± 2 min |
| Demo | 12 min ± 2 min |
| Q&A comfort | Answer top 20 questions without notes |

See: `DEFENSE-REHEARSAL-LOG.md` for mock session records.
