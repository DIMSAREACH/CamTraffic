# Chapter 1 — Introduction [DRAFT]

**Task 382** · CamTraffic Final Year Project · 2026

---

## 1.1 Background

Road traffic injuries remain a leading cause of death in low- and middle-income countries. In Cambodia, rapid motorization and urban expansion have increased exposure to sign-related violations such as ignoring no-entry signs, exceeding posted speed limits, and failing to yield at pedestrian crossings. Traffic police officers cannot physically monitor every intersection around the clock. Manual enforcement is resource-intensive, subjective, and often lacks photographic evidence linked to a structured fine and appeal process.

Computer vision and deep learning offer a practical path to assist enforcement. Object detectors such as YOLO (You Only Look Once) can identify traffic signs in real time from camera frames or uploaded images. When combined with license plate recognition and rule-based violation mapping, detections can feed directly into digital records for officers and drivers.

CamTraffic was developed as an integrated web platform that connects AI-assisted sign detection with violation management, fine issuance, appeals, and bilingual (Khmer/English) user portals for administrators, traffic police, and drivers.

---

## 1.2 Problem Statement

Current traffic enforcement in Cambodia faces four persistent gaps:

1. **Limited continuous monitoring** — Officers cannot observe all sign compliance events across road networks.
2. **Weak evidence linkage** — Violations may be recorded without standardized images or detection metadata.
3. **Delayed citizen communication** — Drivers often learn about fines through indirect channels with limited transparency.
4. **No unified digital workflow** — Sign detection, violation confirmation, fine payment, and appeals typically operate in separate processes.

This project addresses these gaps by building an AI-based traffic sign detection and traffic law enforcement system tailored to Cambodian sign types and institutional roles.

---

## 1.3 Objectives

### Primary objectives

| ID | Objective |
|----|-----------|
| PO1 | Design and implement a YOLO-based detector for Cambodian traffic sign classes |
| PO2 | Integrate license plate OCR to associate vehicles with registered drivers |
| PO3 | Build a Django REST API and PostgreSQL-backed enforcement data model |
| PO4 | Deliver admin and user web portals with role-based access control |
| PO5 | Evaluate detection accuracy, system performance, and user acceptance |

### Secondary objectives

| ID | Objective |
|----|-----------|
| SO1 | Support Khmer and English UI for accessibility |
| SO2 | Provide PDF/Excel reports and audit trails for administrators |
| SO3 | Package the system for production deployment via Docker |

---

## 1.4 Scope

**In scope:** 10-class traffic sign detection model; upload and webcam inference; violation rules engine; fines and appeals; three user roles (admin, police, driver); camera and road registry; notifications; production Docker stack.

**Out of scope:** Mobile native apps; real payment gateway integration; full 31-class sign catalog in production inference; autonomous vehicle integration; hardware camera firmware.

---

## 1.5 Significance

**Academic:** Demonstrates application of modern object detection and expert-system rule mapping in a Southeast Asian traffic enforcement context.

**Practical:** Provides a prototype that traffic authorities could pilot for sign compliance monitoring, evidence storage, and citizen-facing fine transparency.

---

## 1.6 Thesis Organization

| Chapter | Content |
|---------|---------|
| 1 | Introduction |
| 2 | Literature review |
| 3 | Methodology |
| 4 | System design |
| 5 | Implementation |
| 6 | Testing and evaluation |
| 7 | Conclusion and future work |

---

*Draft version — see `CHAPTER-1-INTRODUCTION-FINAL.md` for submission copy.*
