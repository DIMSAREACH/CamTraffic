# CamTraffic — Entity Relationship Diagram

> **Task 005** — Database Design

## Full ER Diagram

```mermaid
erDiagram
  User ||--o| UserProfile : has
  User ||--o{ UserRole : assigned
  Role ||--o{ UserRole : includes
  Role }o--o{ Permission : grants

  User ||--o| Officer : is
  User ||--o| Driver : is
  PoliceStation ||--o{ Officer : employs
  PoliceStation ||--o{ Camera : monitors

  User ||--o{ Vehicle : owns
  SignCategory ||--o{ TrafficSign : classifies

  AIModel ||--o{ AIModelVersion : versions
  Camera ||--o{ Detection : captures
  AIModelVersion ||--o{ Detection : processes
  TrafficSign ||--o{ Detection : identifies
  Detection ||--o| OCRResult : extracts
  Detection ||--o| Violation : triggers

  User ||--o{ Violation : driver
  Vehicle ||--o{ Violation : involved
  Camera ||--o{ Violation : recorded
  TrafficSign ||--o{ Violation : violated
  User ||--o{ Violation : reviewed_by

  Violation ||--o| Fine : generates
  Fine ||--o{ FinePayment : paid_via
  Violation ||--o{ Appeal : appealed
  User ||--o{ Appeal : submits

  User ||--o{ Notification : receives
  NotificationTemplate ||--o{ Notification : uses
  User ||--o{ AuditLog : performs
  User ||--o{ LoginHistory : logs
  User ||--o{ ReportExport : requests

  User {
    uuid id PK
    string username
    string email
    string role
    string phone
  }

  Role {
    int id PK
    string slug UK
    string name
  }

  Permission {
    int id PK
    string codename UK
    string module
  }

  PoliceStation {
    int id PK
    string code UK
    string name
    string province
  }

  Officer {
    int id PK
    int user_id FK
    int station_id FK
    string badge_number UK
  }

  Driver {
    int id PK
    int user_id FK
    string license_number UK
  }

  Vehicle {
    int id PK
    int owner_id FK
    string plate_number UK
  }

  Camera {
    int id PK
    string code UK
    string status
    int station_id FK
  }

  TrafficSign {
    int id PK
    string code UK
    int category_id FK
    decimal fine_amount
  }

  Detection {
    int id PK
    int camera_id FK
    float confidence
    datetime detected_at
  }

  Violation {
    int id PK
    int detection_id FK
    string status
    datetime detected_at
  }

  Fine {
    int id PK
    int violation_id FK
    decimal amount
    string status
    string reference_number UK
  }

  Appeal {
    int id PK
    int violation_id FK
    int driver_id FK
    string status
  }
```

## Table Summary

| Table | App | Description |
|-------|-----|-------------|
| `accounts_user` | accounts | Custom user (AUTH_USER_MODEL) |
| `users_profile` | users | Extended profile & locale |
| `rbac_role` | rbac | RBAC roles |
| `rbac_permission` | rbac | Granular permissions |
| `rbac_user_role` | rbac | User-role assignments |
| `officers_police_station` | officers | Police stations |
| `officers_officer` | officers | Officer profiles |
| `drivers_driver` | drivers | Driver profiles |
| `vehicles_vehicle` | vehicles | Registered vehicles |
| `cameras_camera` | cameras | Traffic cameras |
| `traffic_signs_category` | traffic_signs | Sign categories |
| `traffic_signs_sign` | traffic_signs | Sign catalog |
| `ai_models_model` | ai_models | AI model registry |
| `ai_models_version` | ai_models | Model versions |
| `detections_detection` | detections | AI detection events |
| `ocr_result` | ocr | OCR plate results |
| `violations_violation` | violations | Traffic violations |
| `fines_fine` | fines | Issued fines |
| `fines_payment` | fines | Payment records |
| `appeals_appeal` | appeals | Violation appeals |
| `notifications_template` | notifications | Notification templates |
| `notifications_notification` | notifications | User notifications |
| `audit_log` | audit | System audit trail |
| `audit_login_history` | audit | Login history |
| `system_setting` | system | Key-value settings |
| `system_backup` | system | Backup records |
| `reports_export` | reports | Report export jobs |

## Relationships Flow

```text
Camera → Detection → Violation → Fine → FinePayment
                    ↘ Appeal
         OCRResult ↗
TrafficSign → Detection
AIModelVersion → Detection
User (driver) → Vehicle → Violation
User (officer) → reviews → Violation
```

## Key Field Types

| Table | Field | Type | Constraint |
|-------|-------|------|-----------|
| `accounts_user` | `id` | UUID | PK |
| `vehicles_vehicle` | `plate_number` | VARCHAR(20) | UNIQUE |
| `detections_detection` | `confidence` | FLOAT | — |
| `detections_detection` | `detected_at` | TIMESTAMPTZ | — |
| `violations_violation` | `status` | VARCHAR(20) | choices: pending, approved, rejected, appealed |
| `fines_fine` | `amount` | DECIMAL(12,2) | — |
| `fines_fine` | `due_date` | DATE | — |
| `cameras_camera` | `status` | VARCHAR(20) | choices: online, offline, maintenance, error |

## Phase 11 Integration

The `backend/apps/integration/` package adds no new tables. It orchestrates writes
across the existing tables as follows:

```text
process_camera_frame (Celery task)
  ├── creates  detections_detection
  ├── creates  ocr_result          (if plate recognized)
  ├── creates  violations_violation (if plate matches vehicle)
  └── creates  notifications_notification (for officers + driver)
```
