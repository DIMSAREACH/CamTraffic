# Architecture Diagrams

**Task 150 — Phase 12 Documentation**

All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub and modern Markdown viewers.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    A[["Browser\nAdmin Portal\n:5173"]] -->|REST + JWT| D
    B[["Browser\nDriver/Officer Portal\n:5174"]] -->|REST + JWT| D
    D["Django Backend\n:8000"] -->|HTTP| E["AI Service\n:8001"]
    D -->|ORM| F[("PostgreSQL\n:5432")]
    D -->|Celery tasks| G["Redis\n:6379"]
    G -->|tasks| H["Celery Worker"]
    H -->|HTTP| E
    H -->|ORM| F
    E -->|YOLOv11| I["AI Models\n(weights .pt)"]
    E -->|EasyOCR| I

    subgraph Docker Compose
        D
        E
        F
        G
        H
    end
    subgraph Nginx Reverse Proxy
        A
        B
    end
```

---

## 2. End-to-End Detection Pipeline

```mermaid
sequenceDiagram
    participant Cam as Camera / Client
    participant BE as Django Backend
    participant Cel as Celery Worker
    participant AI as AI Service
    participant DB as PostgreSQL

    Cam->>BE: POST /integration/cameras/{id}/process-frame/ (image)
    BE->>Cel: dispatch process_camera_frame task
    BE-->>Cam: 202 Accepted { task_id }

    Cel->>AI: POST /pipeline/run (image bytes)
    AI-->>Cel: { detections, plate_text, pipeline_mode }

    Cel->>DB: INSERT Detection + OCRResult
    Cel->>DB: SELECT Vehicle WHERE plate_number = ?
    alt Plate matched
        Cel->>DB: INSERT Violation (status=pending)
        Cel->>DB: INSERT Notification (driver)
    end
    Cel->>DB: INSERT Notification × N (station officers)
    Cel-->>BE: { detection_id, violation_id, officers_notified }
```

---

## 3. AI Service Internal Pipeline

```mermaid
graph LR
    I["Image bytes"] --> P["OpenCV\nPreprocessing\n(resize, normalize)"]
    P --> D["YOLOv11\nDetection\n(bounding boxes)"]
    D --> O["EasyOCR\nPlate Region\nExtraction"]
    O --> R["Pipeline\nResponse\n(detections + plate)"]
    D --> R
    P -->|mock mode| R2["Mock\nDetections"]
```

---

## 4. Violation Workflow

```mermaid
stateDiagram-v2
    [*] --> Pending : Auto-created by pipeline
    Pending --> Approved : Officer approves
    Pending --> Rejected : Officer rejects
    Approved --> Appealed : Driver submits appeal
    Appealed --> Approved : Officer rejects appeal
    Appealed --> Rejected : Officer approves appeal
    Approved --> [*] : Fine paid
    Rejected --> [*]
```

---

## 5. Authentication & RBAC

```mermaid
graph TD
    Login["POST /auth/login/"] --> AT["Access Token\n(60 min)"]
    Login --> RT["Refresh Token\n(7 days)"]
    AT -->|Authorization: Bearer| API["Protected API\nEndpoints"]
    API --> RBAC{HasRBACRole?}
    RBAC -->|super_admin| SA["System config\nAll operations"]
    RBAC -->|admin| AD["Camera/Detection\nMonitoring"]
    RBAC -->|officer| OF["Violation review\nDriver management"]
    RBAC -->|driver| DR["Own violations\nFine payment\nAppeals"]
```

---

## 6. Database Entity Map

```mermaid
erDiagram
    User ||--o| Officer : is
    User ||--o| Driver : is
    User ||--o{ Vehicle : owns
    PoliceStation ||--o{ Officer : employs
    PoliceStation ||--o{ Camera : monitors
    Camera ||--o{ Detection : captures
    AIModelVersion ||--o{ Detection : processes
    TrafficSign ||--o{ Detection : identifies
    Detection ||--o| OCRResult : extracts
    Detection ||--o| Violation : triggers
    Vehicle ||--o{ Violation : involved
    Violation ||--o| Fine : generates
    Fine ||--o{ FinePayment : paid_via
    Violation ||--o{ Appeal : appealed
    User ||--o{ Notification : receives
```

---

## 7. Deployment Architecture

```mermaid
graph TD
    Internet -->|HTTPS :443| Nginx
    Nginx -->|:5173| FrontendAdmin["Frontend Admin\n(static files)"]
    Nginx -->|:5174| FrontendUser["Frontend User\n(static files)"]
    Nginx -->|:8000| Backend["Django\n(Gunicorn)"]
    Nginx -->|:8001| AIService["FastAPI\n(Uvicorn)"]
    Backend --> Postgres
    Backend --> Redis
    Redis --> Celery["Celery Worker"]
    Celery --> AIService
    Celery --> Postgres
    AIService --> ModelWeights["model weights\n(.pt files)"]

    subgraph Docker Network
        Backend
        AIService
        Postgres[("PostgreSQL")]
        Redis
        Celery
    end
```

---

## 8. Monorepo Package Structure

```mermaid
graph LR
    FA["frontend-admin"] --> UI["@camtraffic/ui"]
    FA --> API["@camtraffic/api"]
    FA --> Hooks["@camtraffic/hooks"]
    FA --> Types["@camtraffic/types"]
    FA --> Utils["@camtraffic/utils"]
    FU["frontend-user"] --> UI
    FU --> API
    FU --> Hooks
    FU --> Types
    FU --> Utils
```
