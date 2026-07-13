# Chapter 1 — Introduction

**CamTraffic Final Year Project**  
**Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

---

## Abstract

CamTraffic is an integrated digital enforcement platform that applies deep learning-based traffic sign detection and license plate OCR to support Cambodian traffic police and administrators. Built on Django REST Framework, React, PostgreSQL, and YOLO11n, the system connects AI inference to violation records, fines, appeals, and bilingual web portals. Evaluation of the production 10-class sign model yields mAP@50 of 0.908 with approximately 20 FPS CPU inference. User acceptance testing across administrator, officer, and driver roles passed all critical scenarios. This chapter introduces the background, problem statement, objectives, scope, significance, and organization of the thesis.

---

## 1.1 Background

Road traffic injuries remain among the leading causes of preventable death worldwide, with disproportionate impact in developing nations [1]. Cambodia has experienced rapid growth in registered vehicles and urban road networks. Traffic signs regulate speed, turning movements, parking, and right-of-way—but compliance depends on visible enforcement, which cannot scale to every intersection and hour of the day.

Traditional enforcement relies on officers observing violations manually, issuing paper notices, and maintaining separate administrative records. This approach is labor-intensive, difficult to audit, and provides limited transparency for drivers who wish to understand or contest a penalty.

Advances in computer vision—particularly single-stage object detectors such as YOLO—enable automated identification of traffic signs in photographs and video frames with sufficient accuracy for decision support [2]. When combined with structured databases, role-based web applications, and rule engines that map detected signs to legal violations, AI can augment rather than replace human officers.

CamTraffic implements this vision as a deployable software system with three stakeholder roles: system administrators who manage infrastructure and users; traffic police who run detection and confirm violations; and drivers who view fines, pay penalties, and submit appeals.

---

## 1.2 Problem Statement

Despite increasing camera coverage on Cambodian roads, four structural problems persist in traffic sign enforcement:

1. **Incomplete monitoring coverage** — Human patrols cannot observe all sign compliance events continuously across road networks.
2. **Disjoint evidence handling** — Violation records may lack standardized photographic evidence linked to detection metadata such as sign class and confidence.
3. **Delayed driver notification** — Citizens often receive fine information through indirect channels without immediate access to evidence or appeal procedures.
4. **Fragmented digital workflow** — Detection, violation confirmation, fine issuance, payment, and appeals typically operate as separate processes without a unified audit trail.

CamTraffic addresses these problems by providing an end-to-end platform: AI-assisted sign detection → violation rule evaluation → officer review → fine issuance → driver notification → appeal resolution.

---

## 1.3 Objectives

### 1.3.1 Primary Objectives

| ID | Objective | Success criterion |
|----|-----------|-------------------|
| PO1 | Implement Cambodian traffic sign detection | mAP@50 ≥ 0.85 on 10-class validation set |
| PO2 | Integrate license plate OCR | Pipeline operational with logged CER metrics |
| PO3 | Build enforcement backend | REST API covering violations, fines, appeals |
| PO4 | Deliver multi-role web portals | Admin + user portals with RBAC |
| PO5 | Validate system quality | UAT pass + automated test suite green |

### 1.3.2 Secondary Objectives

| ID | Objective |
|----|-----------|
| SO1 | Bilingual Khmer/English user interface |
| SO2 | PDF/Excel reporting and admin audit logs |
| SO3 | Production Docker deployment stack |
| SO4 | Camera registry with live frame preview |

---

## 1.4 Scope

### In Scope

- Ten production sign classes (no-entry, turn restrictions, stop, speed limits, pedestrian crossing, one-way)
- Image upload and webcam-based AI detection
- Violation rules engine mapping sign classes to prohibited actions
- Fine management, payment recording (demo), and appeals
- Administrator, traffic police, and driver roles
- JWT authentication, optional OAuth, RBAC
- Production deployment via Docker Compose (8 services)

### Out of Scope

- Native iOS/Android applications
- Real payment gateway (ABA, Wing, etc.)
- Full 31-class sign inference in production
- Autonomous vehicle or drone integration
- Hardware firmware for IP cameras

---

## 1.5 Significance of the Study

**Academic contribution:** The project demonstrates a complete SDLC from dataset curation through production deployment for AI-assisted traffic enforcement in a Southeast Asian context, integrating object detection with expert-system-style rule mapping.

**Practical contribution:** CamTraffic provides a pilot-ready prototype that traffic authorities could evaluate for sign compliance monitoring, standardized evidence storage, and citizen-facing transparency—without requiring proprietary roadside hardware in the initial phase.

---

## 1.6 Thesis Organization

| Chapter | Title | Contents |
|---------|-------|----------|
| 1 | Introduction | Background, problem, objectives, scope |
| 2 | Literature Review | ITS, sign recognition, YOLO, OCR, expert systems |
| 3 | Methodology | SDLC, dataset, training, testing approach |
| 4 | System Design | Architecture, UML diagrams, security |
| 5 | Implementation | Backend, frontend, AI pipeline |
| 6 | Testing & Evaluation | Model metrics, UAT, performance |
| 7 | Conclusion & Future Work | Summary, limitations, recommendations |

Supporting materials appear in References and Appendices. Diagrams are maintained in `docs/final-year-project/diagrams/`.

---

**Word count (approx.):** 950 · **Status:** Final submission version
