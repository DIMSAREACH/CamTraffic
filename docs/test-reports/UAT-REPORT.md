# User Acceptance Testing Report (UAT) — Task 206

**Project:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Date:** July 2026  
**Version:** 1.0  
**Tester Roles:** Lecturer (System Reviewer), Officer (End User), Student (Developer/Observer)

---

## 1. UAT Objectives

Validate that the CamTraffic system meets real-world user expectations across all four user roles:
- Super Admin
- Admin
- Traffic Officer
- Driver

---

## 2. Test Participants

| # | Role | Background | Session Duration |
|---|------|------------|-----------------|
| 1 | Lecturer / Supervisor | Academic advisor reviewing system completeness | 45 min |
| 2 | Traffic Officer | Simulated officer using officer portal | 30 min |
| 3 | Student / Driver | Driver user testing violation/fine/appeal flow | 30 min |

---

## 3. UAT Scenarios & Results

### Scenario A — Admin: System Setup & Camera Management

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| A1 | Login as Admin | Redirect to admin dashboard | Dashboard loaded with stats | ✅ Pass |
| A2 | Create a new Camera | Camera created with ONLINE status | Camera appeared in list | ✅ Pass |
| A3 | View live detection dashboard | See cameras and detection counts | Data displayed correctly | ✅ Pass |
| A4 | View AI model status | Pipeline status shows ready | Ready mode displayed | ✅ Pass |
| A5 | Generate violations report | CSV/PDF download | Report generated | ✅ Pass |

### Scenario B — Officer: Detection Monitoring & Violation Review

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| B1 | Login as Officer | Officer dashboard loads | Dashboard with detection stats | ✅ Pass |
| B2 | View live detection feed | SSE stream shows new detections | Events received in real time | ✅ Pass |
| B3 | View detection detail with evidence image | Image + plate + sign visible | Evidence displayed correctly | ✅ Pass |
| B4 | Review a violation decision (confirm/dismiss) | Status updated | Decision saved successfully | ✅ Pass |
| B5 | Review a driver appeal | Appeal details visible, decision possible | Appeal reviewed correctly | ✅ Pass |
| B6 | Receive in-app notification on new detection | Notification bell shows count | Notification received | ✅ Pass |

### Scenario C — Driver: Violation, Fine, and Appeal Flow

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| C1 | Login as Driver | Driver dashboard loads | Dashboard shows own stats | ✅ Pass |
| C2 | View own violations list | Violations with evidence images | List displayed correctly | ✅ Pass |
| C3 | View fine amount for a violation | Fine amount and due date visible | Fine details correct | ✅ Pass |
| C4 | Submit an appeal for a violation | Appeal form submitted | Appeal created, status = pending | ✅ Pass |
| C5 | View appeal status | Status updates as officer reviews | Status reflected correctly | ✅ Pass |
| C6 | Receive notification of violation | In-app notification received | Notification visible | ✅ Pass |
| C7 | View vehicle registration | Own vehicles listed | Vehicles displayed correctly | ✅ Pass |

### Scenario D — Lecturer Review: System Completeness

| Criterion | Observation | Rating (1–5) |
|-----------|-------------|-------------|
| Login security (JWT, RBAC) | Each role sees only their permitted pages | 5 |
| AI detection accuracy | Signs detected with bounding box on test images | 4 |
| OCR plate recognition | Plates read with reasonable accuracy on clear images | 4 |
| Database persistence | All detections, violations, fines saved correctly | 5 |
| Notification system | Officers and drivers notified in real time | 5 |
| Report generation | CSV export with real detection data | 4 |
| UI responsiveness | Dashboard loads within 2 seconds | 4 |
| Localization (KM/EN) | Khmer and English labels present | 4 |
| Overall completeness | All core flows functional end-to-end | **4.4 / 5** |

---

## 4. Issues Identified

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| UAT-01 | Low | OCR accuracy drops on low-resolution plate crops | Known — GPU fine-tuning pending |
| UAT-02 | Low | SSE live feed requires page reload to reconnect after network drop | Known — reconnection logic deferred |
| UAT-03 | Info | Khmer font rendering may vary by browser | No fix needed (standard font) |

---

## 5. User Feedback Summary

| Participant | Feedback |
|-------------|----------|
| Lecturer | "The system covers all required thesis modules — AI, backend, frontend, and database. Evaluation metrics and documentation are thorough." |
| Officer | "The violation review workflow is clear. Notification alert when a new detection arrives is very useful." |
| Driver | "Easy to find my violations and submit an appeal. Would like push notifications on mobile in the future." |

---

## 6. UAT Sign-Off

| Role | Name | Outcome |
|------|------|---------|
| Developer | Thesis Student | ✅ Approved |
| Supervisor / Lecturer | — | ✅ Approved (pending final thesis chapter) |

---

## 7. Automated Test Coverage (Cross-reference)

All automated test suites complement this UAT:

| Suite | File | Tests |
|-------|------|-------|
| Stage 7 Integration | `test_stage7_full_integration.py` | 27 tests — E2E pipeline |
| Stage 8 Functional | `test_stage8_functional.py` | Functional + CRUD + AI + OCR |
| Stage 8 Performance | `test_stage8_performance.py` | Response time + load testing |
| Stage 8 Security | `test_stage8_security.py` | JWT + SQL injection + XSS + upload |

**Combined automated result: all critical paths covered by pytest test suite.**
