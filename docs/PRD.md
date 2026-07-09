# Product Requirements Document (PRD)

**Product**: CamTraffic — AI-Based Traffic Sign Detection and Traffic Law Enforcement System
**Version**: 1.0
**Date**: 2026-07
**Author**: CamTraffic Project Team
**Status**: Final Draft

---

## 1. Executive Summary

CamTraffic is an AI-powered traffic law enforcement system for the Kingdom of Cambodia. It uses IP cameras, YOLOv11 deep learning, and EasyOCR to automatically detect traffic violations, recognize license plates, and notify officers and drivers in real time. The system is designed for deployment by traffic police departments to reduce manual monitoring burden and improve road safety compliance.

---

## 2. Problem Statement

Cambodian traffic police currently rely on manual observation and sporadic checkpoints to enforce traffic laws. This leads to:

- Low detection rate of traffic sign violations (speed, no-entry, illegal turns).
- Delayed notification to drivers and officers.
- Manual and error-prone record-keeping of violations and fines.
- No centralized visibility across multiple camera stations.

---

## 3. Objectives

| # | Objective |
|---|-----------|
| O1 | Automatically detect traffic sign violations from camera streams using AI |
| O2 | Recognize Cambodian license plates via OCR to identify vehicles |
| O3 | Match detected plates to registered vehicles and generate violation records |
| O4 | Notify traffic officers in real time through an officer portal |
| O5 | Allow drivers to view, appeal, and pay fines via a driver portal |
| O6 | Provide administrators with reporting, audit, and system management tools |
| O7 | Support Khmer and English across all user interfaces |

---

## 4. Target Users

| Role | Description |
|------|-------------|
| **Super Admin** | System-wide configuration, user management, AI model management |
| **Admin** | Camera management, detection monitoring, report generation |
| **Traffic Officer** | Review violations, approve/reject, manage drivers and vehicles |
| **Driver** | View violations, appeal, pay fines, manage profile |

---

## 5. Functional Requirements

### 5.1 AI Detection Pipeline
- FR-AI-01: System shall detect traffic signs in camera frames using YOLOv11 with ≥75% confidence threshold.
- FR-AI-02: System shall recognize Cambodian license plate text using EasyOCR.
- FR-AI-03: System shall match detected plates against the vehicle registry.
- FR-AI-04: System shall store detection metadata (camera, timestamp, bounding box, confidence, plate).
- FR-AI-05: System shall support mock mode when trained weights are unavailable.

### 5.2 Violation Workflow
- FR-VIO-01: System shall auto-create a pending violation when a plate matches a registered vehicle and a traffic sign is detected.
- FR-VIO-02: Officers shall be able to approve or reject pending violations with notes.
- FR-VIO-03: Approved violations shall automatically generate a fine with reference number.
- FR-VIO-04: Drivers shall be able to submit an appeal within the allowed period.

### 5.3 Notifications
- FR-NOT-01: In-app notifications shall be created for station officers when a new detection occurs at their camera.
- FR-NOT-02: In-app notifications shall be sent to drivers when a violation is created for their vehicle.
- FR-NOT-03: Officers shall be able to mark notifications as read individually or all-at-once.

### 5.4 Camera Management
- FR-CAM-01: Admins shall be able to register, update, and deactivate cameras.
- FR-CAM-02: System shall perform and record camera health checks.
- FR-CAM-03: Cameras shall support RTSP stream URLs for live feed integration.

### 5.5 Reporting
- FR-RPT-01: Admins and officers shall generate violation, detection, and fine reports.
- FR-RPT-02: Reports shall be exportable in CSV/PDF formats.

### 5.6 Administration
- FR-ADM-01: Super admins shall manage user accounts, roles, and permissions (RBAC).
- FR-ADM-02: System settings (fine amounts, currency, due days) shall be configurable.
- FR-ADM-03: System shall maintain full audit logs for sensitive actions.
- FR-ADM-04: Admins shall be able to trigger and monitor database backups.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | AI inference < 200 ms per frame on GPU; < 2 s on CPU |
| NFR-02 | Availability | System targets 99.5% uptime in production |
| NFR-03 | Security | All API endpoints protected by JWT; passwords hashed with argon2 |
| NFR-04 | Scalability | Celery workers scale horizontally for background tasks |
| NFR-05 | Localisation | All user-facing text supports English and Khmer (km) |
| NFR-06 | Compliance | Fine and violation workflows comply with Cambodian traffic regulations |
| NFR-07 | Maintainability | > 70% test coverage for backend and AI service |

---

## 7. Out of Scope (v1.0)

- Real-time RTSP video streaming in-browser (deferred to v2).
- Mobile application (web-only in v1).
- Court case management integration.
- Automated SMS/email push notifications (in-app only in v1).

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Detection mAP@50 (val) | ≥ 0.80 after full training |
| Plate OCR exact match rate | ≥ 0.85 after QC and fine-tuning |
| Violation processing time (camera frame → officer notification) | < 5 s |
| System uptime | ≥ 99.5% |

---

## 9. Constraints

- Deployed on-premises at police stations; internet connectivity may be limited.
- Traffic sign dataset is limited to the Cambodian context.
- OCR transcriptions require manual QC before production fine-tuning.
