# Activity Diagrams — Master Build Workflows

**Thesis:** AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Chapter:** 3–4 (System Analysis & Design)  
**Source:** [`docs/COMPLETE-SYSTEM-WORKFLOW.md`](../../COMPLETE-SYSTEM-WORKFLOW.md)

Paste Mermaid into draw.io, PlantUML converters, or thesis Markdown exporters.

---

## A1 — Role entry

```mermaid
flowchart TD
  start([Start]) --> login[Login / Register]
  login --> jwt[JWT Authentication]
  jwt --> rbac{Role?}
  rbac -->|Admin| admin[Admin Dashboard]
  rbac -->|Police| police[Officer Dashboard]
  rbac -->|Driver| driver[Driver Dashboard]
  admin --> end1([Portal modules])
  police --> end2([Detection & enforcement])
  driver --> end3([Fines & appeals])
```

---

## A2 — AI detection pipeline

```mermaid
flowchart TD
  start([Media input]) --> capture[Upload / Capture frame]
  capture --> api[AI Detection API]
  api --> veh[Vehicle YOLO]
  veh --> sign[Traffic Sign YOLO]
  sign --> plate[Plate Detection]
  plate --> ocr[OCR]
  ocr --> rules[Violation Rule Engine]
  rules --> log[(Detection Log)]
  log --> review[Officer Review]
  review --> stop([Continue to violation flow])
```

---

## A3 — Police detection → fine

```mermaid
flowchart TD
  start([Officer login]) --> dash[Dashboard]
  dash --> src[Select source]
  src --> run[Run AI Detection]
  run --> review[Review boxes + OCR]
  review --> q{Approve?}
  q -->|No| reject[Reject + log]
  reject --> end1([End])
  q -->|Yes| viol[Create Violation]
  viol --> fine[Create Fine]
  fine --> notify[Notify Driver]
  notify --> end2([End])
```

---

## A4 — Driver pay / appeal

```mermaid
flowchart TD
  start([Driver login]) --> note[Receive notification]
  note --> view[View violation + evidence + fine]
  view --> act{Action?}
  act -->|Pay| pay[Complete payment]
  pay --> end1([Paid])
  act -->|Appeal| appeal[Submit appeal]
  appeal --> or[Officer review]
  or --> out{Outcome?}
  out -->|Approve| waive[Fine cancelled]
  out -->|Reject| keep[Fine remains]
  waive --> n[Notify driver]
  keep --> n
  n --> end2([End])
```

---

## A5 — End-to-end enforcement

```mermaid
flowchart TD
  media[Camera / Upload / Webcam] --> ai[AI Engine]
  ai --> det[Vehicle + Sign + OCR]
  det --> rules[Rule Engine]
  rules --> log[(Detection Log)]
  log --> police[Police Review]
  police -->|Reject| rj[Rejected Log]
  police -->|Approve| v[Violation]
  v --> f[Fine]
  f --> n[Notify]
  n --> driver[Driver Dashboard]
  driver -->|Pay| pay[Payment]
  driver -->|Appeal| ap[Appeal Review]
  pay --> report[Reports]
  ap --> report
  report --> admin[Admin Analytics]
```

---

## Sequence — Officer detect to notify (refined)

```mermaid
sequenceDiagram
  actor Officer
  participant UI as Officer Portal
  participant API as Django API
  participant AI as YOLO + OCR + Rules
  participant DB as PostgreSQL
  participant N as Notifications
  actor Driver

  Officer->>UI: Select image/video/webcam/camera
  UI->>API: POST /api/ai/detect/ (or process-frame)
  API->>AI: Run pipeline stages
  AI-->>API: boxes, plate text, rule suggestion
  API->>DB: INSERT AIDetectionLog
  API-->>UI: Detection result JSON + media
  Officer->>UI: Confirm / edit plate + observed action
  UI->>API: Create/approve violation + issue fine
  API->>DB: INSERT Violation, Fine, Evidence links
  API->>N: Create in-app notification
  N->>DB: INSERT Notification
  N-->>Driver: Fine created notice
  Driver->>UI: Open Driver Dashboard
```

---

## PlantUML activity (optional export)

```plantuml
@startuml
|Police|
start
:Select detection source;
:Run AI detection;
:Review boxes and OCR;
if (Approve?) then (yes)
  :Create violation;
  :Create fine;
  :Notify driver;
else (no)
  :Save rejected log;
endif
stop
@enduml
```

---

*Use with COMPLETE-SYSTEM-WORKFLOW.md for full ASCII + Mermaid + DFD Level 0–1.*
