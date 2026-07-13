# Sequence Diagram — Violation Detection to Notification

**Task:** 373 · **Ref:** P011 · **Parent:** `docs/ARCHITECTURE-DIAGRAMS.md` §4

---

## Scenario

An officer uploads a traffic scene image. The system detects a sign, evaluates violation rules, creates records, and notifies the driver if applicable.

---

## Participants

| Participant | Component |
|-------------|-----------|
| Officer UI | `frontend-user` — AI Detection page |
| Django API | `backend/ai_detection/views.py` |
| Detection Pipeline | YOLO + OCR + rule engine |
| PostgreSQL | Violations, fines, logs |
| Notifications | `notifications` app |

---

## Sequence

```mermaid
sequenceDiagram
  participant O as Officer UI
  participant API as Django API
  participant AI as Detection Pipeline
  participant DB as PostgreSQL
  participant N as Notifications

  O->>API: POST /api/ai/detect/ (multipart image)
  API->>AI: Run YOLO sign detection
  AI->>AI: Vehicle bbox + plate OCR
  AI-->>API: signs[], plates[], confidence
  API->>DB: INSERT AIDetectionLog

  alt Violation rule matched
    API->>DB: INSERT TrafficViolation
    API->>DB: INSERT Fine (if auto-fine enabled)
    API->>N: CREATE notification for driver
    N->>DB: INSERT Notification
  else No violation
    API-->>O: Detection result only
  end

  API-->>O: JSON { signs, violation_id, fine_id }
  O->>O: Display annotated result
```

---

## API endpoints involved

| Step | Endpoint |
|------|----------|
| Detection | `POST /api/ai/detect/` |
| Rule evaluation | Internal — `pipeline_enforcement.evaluate_violation()` |
| Violation create | `POST /api/violations/` (optional manual confirm) |
| Fine create | `POST /api/fines/` |
| Notification | Auto-created on fine issuance |

---

## Alternate flow — Webcam

```mermaid
sequenceDiagram
  participant O as Officer UI
  participant API as Django API
  participant AI as Detection Pipeline

  O->>O: Capture webcam frame (canvas)
  O->>API: POST /api/ai/process-frame/ (base64)
  API->>AI: Same pipeline as detect/
  AI-->>API: Result
  API-->>O: JSON response
```

---

## Related diagrams

- Activity flow: `docs/ARCHITECTURE-DIAGRAMS.md` §2
- Login sequence: `docs/ARCHITECTURE-DIAGRAMS.md` §5
- Appeal flow: `docs/ARCHITECTURE-DIAGRAMS.md` §3
