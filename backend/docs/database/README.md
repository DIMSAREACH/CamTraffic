# Database Design

> **Phase 1** · Task **005** — Complete

## Overview

PostgreSQL database schema for CamTraffic with 25+ tables across 18 Django apps.

## Documentation

- [ER-DIAGRAM.md](./ER-DIAGRAM.md) — Full Mermaid ER diagram and table summary

## Entity Map

| Entity | App | Table |
|--------|-----|-------|
| User | `accounts` | `accounts_user` |
| UserProfile | `users` | `users_profile` |
| Role / Permission | `rbac` | `rbac_role`, `rbac_permission` |
| PoliceStation / Officer | `officers` | `officers_police_station`, `officers_officer` |
| Driver | `drivers` | `drivers_driver` |
| Vehicle | `vehicles` | `vehicles_vehicle` |
| Camera | `cameras` | `cameras_camera` |
| SignCategory / TrafficSign | `traffic_signs` | `traffic_signs_category`, `traffic_signs_sign` |
| AIModel / AIModelVersion | `ai_models` | `ai_models_model`, `ai_models_version` |
| Detection | `detections` | `detections_detection` |
| OCRResult | `ocr` | `ocr_result` |
| Violation | `violations` | `violations_violation` |
| Fine / FinePayment | `fines` | `fines_fine`, `fines_payment` |
| Appeal | `appeals` | `appeals_appeal` |
| NotificationTemplate / Notification | `notifications` | `notifications_template`, `notifications_notification` |
| AuditLog / LoginHistory | `audit` | `audit_log`, `audit_login_history` |
| SystemSetting / BackupRecord | `system` | `system_setting`, `system_backup` |
| ReportExport | `reports` | `reports_export` |

## Commands

```bash
# Apply migrations
python manage.py migrate

# Seed reference data (roles, signs, stations, admin user)
python manage.py seed_database
```

Default superuser after seed: `admin` / `admin1234`

## Deliverables

- [x] ER Diagram — `ER-DIAGRAM.md`
- [x] Django models in respective apps
- [x] Migration files
- [x] Seed data command (`seed_database`)

## Status

- [x] Task 005 complete
