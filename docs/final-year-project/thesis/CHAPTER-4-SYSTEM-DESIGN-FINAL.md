# Chapter 4 - System Design (Final)

Task: 394
Date: 2026-07-10

## 4.1 Architecture Design

CamTraffic uses a service-oriented architecture:
- Django backend for domain/business logic
- FastAPI AI service for detection/OCR
- React portals for admin and officer/driver users
- Redis/Celery for asynchronous workflow execution
- PostgreSQL for persistent records and auditability

## 4.2 Final Diagram Set

- Use Case: `docs/final-year-project/diagrams/USE-CASE-DIAGRAM.md`
- Class: `docs/final-year-project/diagrams/CLASS-DIAGRAM.md`
- Sequence: `docs/final-year-project/diagrams/SEQUENCE-DIAGRAM-VIOLATION-FLOW.md`
- Deployment: `docs/final-year-project/diagrams/DEPLOYMENT-DIAGRAM.md`

## 4.3 Data Design

Key entities include user/account roles, camera sources, detection events, OCR outputs, violations, fines, appeals, notifications, and audit records.

## 4.4 Security and Role Model

RBAC enforces least-privilege endpoint access and workflow restrictions for super_admin, admin, officer, and driver roles.

## 4.5 Design Conclusion

The final design supports modular scaling, audit-ready workflows, and direct alignment between AI output and enforcement processes.
