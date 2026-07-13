# CamTraffic — Architecture Diagrams

**Version:** 1.0 · **Date:** July 2026

UML-style diagrams for Phase 0 planning (P009–P012). Render Mermaid in GitHub, VS Code, or Cursor preview.

---

## 1. Use Case Diagram (P009)

```mermaid
flowchart LR
  subgraph Actors
    Admin([System Admin])
    Police([Traffic Police])
    Driver([Driver])
    AI([AI Engine])
  end

  subgraph CamTraffic System
    UC1(Manage users & roles)
    UC2(Manage signs & cameras)
    UC3(Run AI detection)
    UC4(Review violations)
    UC5(Issue & pay fines)
    UC6(Submit & review appeals)
    UC7(View reports & audit)
    UC8(Manage vehicles)
    UC9(Receive notifications)
  end

  Admin --> UC1
  Admin --> UC2
  Admin --> UC7
  Admin --> UC3

  Police --> UC3
  Police --> UC4
  Police --> UC5
  Police --> UC6
  Police --> UC2
  Police --> UC7

  Driver --> UC5
  Driver --> UC6
  Driver --> UC8
  Driver --> UC9

  UC3 --> AI
```

---

## 2. Activity Diagram — Detection to Fine (P010)

```mermaid
flowchart TD
  A([Start]) --> B{Input source?}
  B -->|Upload| C[Send image to /api/ai/detect/]
  B -->|Webcam| D[Capture frame]
  D --> C
  C --> E[YOLO sign + vehicle detection]
  E --> F[OCR plate if detected]
  F --> G{Violation rule matched?}
  G -->|No| H[Log detection only]
  G -->|Yes| I[Create TrafficViolation record]
  I --> J[Attach evidence image]
  J --> K[Create Fine if applicable]
  K --> L[Notify driver]
  L --> M([End])
  H --> M
```

---

## 3. Activity Diagram — Appeal Flow (P010)

```mermaid
flowchart TD
  A([Driver submits appeal]) --> B[Appeal status: pending]
  B --> C{Officer review}
  C -->|Approve| D[Fine dismissed or reduced]
  C -->|Reject| E[Appeal rejected]
  D --> F[Notify driver]
  E --> F
  F --> G([End])
```

---

## 4. Sequence Diagram — Camera to Notification (P011)

```mermaid
sequenceDiagram
  participant O as Officer UI
  participant API as Django API
  participant AI as Detection Pipeline
  participant DB as PostgreSQL
  participant N as Notifications

  O->>API: POST /api/ai/detect/ (image)
  API->>AI: Run YOLO + OCR
  AI-->>API: signs, plates, confidence
  API->>DB: Save AIDetectionLog
  alt Violation detected
    API->>DB: Create Violation + Fine
    API->>N: Create notification for driver
  end
  API-->>O: JSON result + IDs
  O->>O: Display result / confirm
```

---

## 5. Sequence Diagram — Login (P011)

```mermaid
sequenceDiagram
  participant C as Client Portal
  participant API as /api/auth/
  participant DB as Database

  C->>API: POST /login/ {email, password}
  API->>DB: Validate user + role
  DB-->>API: User record
  API-->>C: access + refresh JWT
  C->>C: Store token, route by role
  Note over C: admin → /admin/dashboard<br/>police/driver → /dashboard
```

---

## 6. Class Diagram — Core Domain (P012)

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

  User "1" --> "*" Vehicle : owns
  User "1" --> "*" Fine : receives
  User "1" --> "*" TrafficViolation : driver/officer
  TrafficViolation "1" --> "0..1" Fine
  Fine "1" --> "0..*" Appeal
  User "1" --> "*" AIDetectionLog : performs
```

---

## 7. Entity-Relationship Overview (P013)

Full SQL DDL: **`docs/SCHEMA.sql`**

```mermaid
erDiagram
  USERS ||--o{ VEHICLES : owns
  USERS ||--o{ FINES : receives
  USERS ||--o{ AI_DETECTION_LOGS : creates
  USERS ||--o{ TRAFFIC_VIOLATIONS : involved
  TRAFFIC_VIOLATIONS ||--o| FINES : generates
  FINES ||--o{ APPEALS : contested
  TRAFFIC_SIGNS ||--o{ AI_DETECTION_LOGS : referenced
  CAMERAS }o--|| ROADS : located_on

  USERS {
    uuid id PK
    string email UK
    string role
    string full_name
  }

  FINES {
    uuid id PK
    decimal amount
    string status
    uuid driver_id FK
  }

  TRAFFIC_VIOLATIONS {
    uuid id PK
    string violation_type
    string status
    uuid driver_id FK
  }
```

> **Note:** Production Django models use UUID primary keys (`core.models.UUIDPrimaryKeyModel`). Legacy `SCHEMA.sql` may show BIGINT for early reference — migrations in `backend/*/migrations/` are authoritative.

---

## 8. Deployment Diagram (reference)

See deployment section in `docs/ARCHITECTURE.md` and `docker-compose.yml`.

---

## 9. Document Index

| Task | Diagram | Section |
|------|---------|---------|
| P009 | Use case | §1 |
| P010 | Activity | §2, §3 |
| P011 | Sequence | §4, §5 |
| P012 | Class | §6 |
| P013 | ER | §7 + SCHEMA.sql |
| P014 | Architecture narrative | `ARCHITECTURE.md` |
| P015 | Tech stack table | `ARCHITECTURE.md` §4 |
