# Class Diagram — CamTraffic Core Domain

**Task:** 372 · **Ref:** P012 · **Parent:** `docs/ARCHITECTURE-DIAGRAMS.md` §6

---

## Domain classes

Core entities map to Django models in `backend/*/models.py`.

| Class | App | Key fields |
|-------|-----|------------|
| `User` | `users` | id, email, role, full_name |
| `Officer` | `users` | badge_no, station_id |
| `Driver` | `users` | license_no, license_expiry |
| `Vehicle` | `vehicles` | plate_number, vehicle_type |
| `TrafficSign` | `traffic_signs` | sign_code, category, penalty |
| `ViolationRule` | `violations` | sign_class_key, prohibited_action |
| `TrafficViolation` | `violations` | violation_type, status, evidence |
| `Fine` | `fines` | amount, status, due_date |
| `Appeal` | `appeals` | reason, status, decision |
| `Camera` | `infrastructure` | code, frame_url, status |
| `Road` | `infrastructure` | name, speed_limit |
| `AIDetectionLog` | `ai_detection` | detected_sign, confidence |
| `Notification` | `notifications` | title, message, read |
| `AuditLog` | `audit` | action, actor, timestamp |

---

## Diagram

```mermaid
classDiagram
  class User {
    +UUID id
    +email
    +full_name
    +role admin|police|driver
    +license_no
    +profile_image
  }

  class Officer {
    +UUID id
    +badge_no
    +station_id
  }

  class Driver {
    +UUID id
    +license_no
    +license_expiry
  }

  class Vehicle {
    +UUID id
    +plate_number
    +vehicle_type
    +owner_id
  }

  class TrafficSign {
    +id
    +sign_code
    +sign_name
    +category
    +penalty
  }

  class ViolationRule {
    +id
    +sign_class_key
    +prohibited_action
    +default_fine
  }

  class TrafficViolation {
    +UUID id
    +violation_type
    +detected_sign_code
    +status
    +driver_id
    +officer_id
  }

  class Fine {
    +UUID id
    +amount
    +status
    +driver_id
    +violation_id
  }

  class Appeal {
    +UUID id
    +reason
    +status
    +fine_id
  }

  class Camera {
    +UUID id
    +code
    +location
    +status
  }

  class AIDetectionLog {
    +id
    +detected_sign
    +confidence
    +user_id
  }

  User <|-- Officer : extends
  User <|-- Driver : extends
  User "1" --> "*" Vehicle : owns
  User "1" --> "*" Fine : receives
  User "1" --> "*" TrafficViolation : involved
  TrafficViolation "1" --> "0..1" Fine : generates
  Fine "1" --> "0..*" Appeal : contested
  ViolationRule "1" --> "*" TrafficViolation : defines
  TrafficSign "1" --> "*" AIDetectionLog : referenced
  User "1" --> "*" AIDetectionLog : performs
  Road "1" --> "*" Camera : has
```

---

## Service layer (non-persistent)

| Service | Module | Responsibility |
|---------|--------|----------------|
| `DetectionPipeline` | `ai_detection.pipeline_enforcement` | YOLO + OCR + rule match |
| `AuditService` | `core.audit_service` | Log admin mutations |
| `EmailVerification` | `authentication.email_verification` | Send/confirm emails |
