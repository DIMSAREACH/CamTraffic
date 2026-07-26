# CamTraffic Complete System Workflow

**Topic:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

**Source:** CamTraffic Master Build Prompt  
**Roles:** Admin · Police Officer · Driver  
**Core flow:** camera/upload → AI detection → officer review → fine → driver notification → payment/appeal → reporting

**Aligned implementation:** Admin portal (`src/web/admin`) · User portal (`src/web/user`) · Django API + `ai_detection` · PostgreSQL

**Thesis use:** Convert sections below into UML Activity / Sequence / DFD / BPMN for Chapter 3–4.

**Related:** [`SYSTEM-WORKFLOW.md`](SYSTEM-WORKFLOW.md) · [`PRODUCTION-WORKFLOW-AND-DEMO.md`](PRODUCTION-WORKFLOW-AND-DEMO.md) · [`final-year-project/diagrams/`](final-year-project/diagrams/)

---

## 1. Role entry (Visitor → Portals)

```text
                         ┌────────────────────────┐
                         │       Visitor          │
                         └──────────┬─────────────┘
                                    │
                                    ▼
                           Login / Register
                                    │
                           JWT Authentication
                                    │
                     Role-Based Access Control
                                    │
        ┌───────────────────────────┼──────────────────────────┐
        │                           │                          │
        ▼                           ▼                          ▼
     Admin                     Police Officer               Driver
  (admin portal)              (user portal)              (user portal)
```

```mermaid
flowchart TD
  V[Visitor] --> LR[Login / Register]
  LR --> JWT[JWT Authentication]
  JWT --> RBAC[Role-Based Access Control]
  RBAC --> A[Admin Portal]
  RBAC --> P[Police Officer Portal]
  RBAC --> D[Driver Portal]
```

| Role | Portal | Primary job |
|------|--------|-------------|
| Admin | `:5174` admin | Master data, AI ops, oversight, reports, settings |
| Police Officer | `:5173` police | Detect, review, violate, fine, review appeals |
| Driver | `:5173` citizen/driver | View evidence, pay, appeal, notifications |

---

## 2. Overall system workflow

```text
Start → User Login → Authentication → Role Verification
   → Dashboard (Admin | Police | Driver)
```

```mermaid
flowchart TD
  S[Start] --> L[User Login]
  L --> Auth[Authentication]
  Auth --> Role[Role Verification]
  Role --> Dash{Dashboard}
  Dash --> AdminD[Admin modules]
  Dash --> PoliceD[Police modules]
  Dash --> DriverD[Driver modules]
```

---

## 3. AI Detection workflow

**Runtime inference pipeline** (Master Build + CamTraffic `pipeline.py`):

```text
Image / Video / Webcam / Live Camera
        │
        ▼
Upload Frame
        │
        ▼
AI Detection API
        │
        ▼
Vehicle Detection (YOLO)
        │
        ▼
Traffic Sign Detection
        │
        ▼
License Plate Detection
        │
        ▼
OCR Read Plate
        │
        ▼
Violation Rule Engine
        │
        ▼
Detection Log
        │
        ▼
Officer Review
```

```mermaid
flowchart TD
  SRC[Image / Video / Webcam / Live Camera] --> UP[Upload / Capture Frame]
  UP --> API[AI Detection API]
  API --> V[Vehicle Detection YOLO]
  V --> S[Traffic Sign Detection]
  S --> P[License Plate Detection]
  P --> OCR[OCR Read Plate]
  OCR --> RE[Violation Rule Engine]
  RE --> LOG[Detection Log DB]
  LOG --> REV[Officer Review]
```

| Stage | CamTraffic module |
|-------|-------------------|
| Upload / frame | `ai_detection/views.py`, video utils, frame capture |
| Vehicle / sign / plate | YOLO weights in `ai/weights/` |
| OCR | EasyOCR plate crop path |
| Rule engine | `pipeline_enforcement.py` |
| Log | `AIDetectionLog` |
| Review | Officer AI Detection / Violations UI |

**Honest runtime note:** OCR is assistive; officer confirms plate/violation before fine issue. Live RTSP requires real `frame_source_url` / `rtsp_url`.

---

## 4. Police Officer workflow

```text
Login → Dashboard → Select Detection Source
   → Upload Image | Upload Video | Webcam | Live Camera
   → Run AI Detection → Detection Result
   → Review Bounding Boxes → Review OCR Plate
   → Approve?
        Yes → Create Violation → Create Fine → Send Notification → End
        No  → Reject Detection → Save Rejected Log → End
```

```mermaid
flowchart TD
  L[Login] --> D[Dashboard]
  D --> SRC[Select Detection Source]
  SRC --> RUN[Run AI Detection]
  RUN --> RES[Detection Result]
  RES --> BOX[Review Boxes + OCR]
  BOX --> Q{Approve?}
  Q -->|Yes| V[Create Violation]
  V --> F[Create Fine]
  F --> N[Send Notification]
  N --> E1[End]
  Q -->|No| R[Reject Detection]
  R --> RL[Save Rejected Log]
  RL --> E2[End]
```

---

## 5. Driver workflow

```text
Login → Dashboard → Receive Notification
   → View Violation → View Evidence → View Fine
   → Pay Fine | Appeal Fine
   → If Appeal: Submit → Officer Review → Approved/Rejected → Notify Driver
   → If Pay: Payment Completed
```

```mermaid
flowchart TD
  L[Login] --> D[Dashboard]
  D --> N[Receive Notification]
  N --> VV[View Violation + Evidence + Fine]
  VV --> ACT{Pay or Appeal?}
  ACT -->|Pay| PAY[Payment Completed KHQR / Manual]
  ACT -->|Appeal| APP[Submit Appeal]
  APP --> OR[Officer Review]
  OR --> AR{Approved / Rejected}
  AR --> DN[Driver Notification]
```

---

## 6. Admin workflow

```text
Login → Admin Dashboard
   ├── User Management
   ├── Police Management
   ├── Driver Management
   ├── Vehicle Management
   ├── Traffic Sign Management
   ├── Road Management
   ├── Camera Management
   ├── AI Model Management
   ├── Dataset Management
   ├── AI Training
   ├── AI Detection Logs
   ├── Violation Management
   ├── Fine Management
   ├── Appeal Management
   ├── Notification Management
   ├── Reports & Analytics
   ├── Audit Logs
   ├── Backup & Restore
   └── System Settings
```

```mermaid
flowchart TD
  L[Login] --> AD[Admin Dashboard]
  AD --> U[Users / Police / Drivers]
  AD --> M[Vehicles / Signs / Roads / Cameras]
  AD --> AI[AI Models / Datasets / Training / Logs]
  AD --> EN[Violations / Fines / Appeals]
  AD --> OPS[Notifications / Reports / Audit / Backup / Settings]
```

---

## 7. Violation workflow

```text
AI Detection → Suggested Violation → Officer Review
   → Reject → Rejected Log
   → Approve → Create Violation → Assign Driver → Create Fine → Notify Driver
```

```mermaid
flowchart TD
  AI[AI Detection] --> SUG[Suggested Violation]
  SUG --> OR[Officer Review]
  OR --> Q{Approve?}
  Q -->|Reject| RJ[Rejected Log]
  Q -->|Approve| CV[Create Violation]
  CV --> AD[Assign Driver / Vehicle]
  AD --> CF[Create Fine]
  CF --> ND[Notify Driver]
```

---

## 8. Fine workflow

```text
Violation Created → Fine Generated → Pending → Driver Action
   → Pay → Paid
   → Appeal → Officer Review → Approve (Fine Waived) | Reject (Fine Remains)
```

```mermaid
flowchart TD
  V[Violation Created] --> F[Fine Generated Pending]
  F --> DA{Driver Action}
  DA -->|Pay| PAID[Paid]
  DA -->|Appeal| OR[Officer Review]
  OR -->|Approve| W[Fine Waived / Cancelled]
  OR -->|Reject| REM[Fine Remains Active]
```

---

## 9. Appeal workflow

```text
Driver Submit Appeal → Pending → Police Review
   → Approve → Fine Cancelled → Notify Driver
   → Reject → Fine Active → Notify Driver
```

```mermaid
flowchart TD
  S[Driver Submit Appeal] --> P[Pending]
  P --> R[Police Review]
  R -->|Approve| C[Fine Cancelled]
  R -->|Reject| A[Fine Active]
  C --> N[Notify Driver]
  A --> N
```

---

## 10. Notification workflow

```text
Triggers: Fine Created | Appeal Approved | Appeal Rejected | Password Reset | System Broadcast
   → Notification Service → In-App (always) | Email (when configured)
```

```mermaid
flowchart TD
  T[Fine / Appeal / Password / Broadcast] --> NS[Notification Service]
  NS --> IA[In-App]
  NS --> EM[Email when Resend/SMTP configured]
  IA --> U[Driver / Police / Admin inbox]
```

---

## 11. AI Model workflow

```text
Upload Dataset → Training → Validation → Evaluation → mAP Metrics
   → Upload Weight → Activate Model → Production Detection
```

```mermaid
flowchart TD
  DS[Upload Dataset] --> TR[Training CLI / register]
  TR --> VAL[Validation]
  VAL --> EV[Evaluation]
  EV --> MAP[mAP / Precision / Recall]
  MAP --> W[Upload / Register Weight]
  W --> ACT[Activate Model]
  ACT --> PROD[Production Detection]
```

**Thesis note:** Training Center registers weights and shows history; remote GPU Start/Stop job server is optional — CLI training is the production thesis path.

---

## 12. Reporting workflow

```text
System Data → Dashboard Analytics → Generate Charts
   → PDF | Excel | Live Dashboard
```

```mermaid
flowchart TD
  DATA[System Data PostgreSQL] --> AN[Dashboard Analytics]
  AN --> CH[Generate Charts]
  CH --> PDF[Export PDF]
  CH --> XLS[Export Excel]
  CH --> UI[Dashboard UI]
```

---

## 13. Complete end-to-end workflow

```text
Camera / Image / Video / Webcam
                │
                ▼
        AI Detection Engine
                │
                ▼
     Vehicle + Traffic Sign + OCR
                │
                ▼
      Violation Rule Engine
                │
                ▼
      Detection Log Database
                │
                ▼
        Police Review Screen
                │
      ┌─────────┴─────────┐
      │                   │
  Reject              Approve
      │                   │
      ▼                   ▼
 Rejected Log     Create Violation
                          │
                          ▼
                     Create Fine
                          │
                          ▼
                  Notify Driver
                          │
                          ▼
                 Driver Dashboard
                          │
              ┌───────────┴───────────┐
              │                       │
          Pay Fine              Submit Appeal
              │                       │
              ▼                       ▼
          Payment              Police Review
              │                       │
              └───────────┬───────────┘
                          ▼
                   Final Report
                          │
                          ▼
                    Admin Dashboard
```

```mermaid
flowchart TD
  SRC[Camera / Image / Video / Webcam] --> AI[AI Detection Engine]
  AI --> DET[Vehicle + Sign + OCR]
  DET --> RE[Violation Rule Engine]
  RE --> LOG[Detection Log DB]
  LOG --> REV[Police Review]
  REV -->|Reject| RJ[Rejected Log]
  REV -->|Approve| CV[Create Violation]
  CV --> CF[Create Fine]
  CF --> ND[Notify Driver]
  ND --> DD[Driver Dashboard]
  DD -->|Pay| PAY[Payment]
  DD -->|Appeal| APP[Police Appeal Review]
  PAY --> REP[Final Report]
  APP --> REP
  REP --> ADMIN[Admin Dashboard Analytics]
```

---

## 14. DFD Level 0 (Context)

```text
                    ┌──────────────────────────────────────┐
   Admin ──────────►│                                      │
   Officer ────────►│         CamTraffic System            │◄──── Cameras / Files
   Driver ─────────►│   (Web portals + API + AI + DB)      │
                    │                                      ├─────► Notifications
                    └──────────────────────────────────────┘
                                      │
                                      ▼
                                 PostgreSQL
```

```mermaid
flowchart LR
  Admin --> SYS[CamTraffic System]
  Officer --> SYS
  Driver --> SYS
  Cam[Cameras / Uploads] --> SYS
  SYS --> DB[(PostgreSQL)]
  SYS --> N[Notifications]
```

---

## 15. DFD Level 1 (Major processes)

| # | Process | Inputs | Outputs |
|---|---------|--------|---------|
| 1.0 | Authenticate & Authorize | credentials | JWT + role |
| 2.0 | Manage Master Data | admin CRUD | users, signs, cameras, vehicles |
| 3.0 | Detect & Enforce | frames/media | detection logs, draft violations |
| 4.0 | Review & Fine | officer decisions | violations, fines |
| 5.0 | Driver Respond | pay/appeal | payments, appeals |
| 6.0 | Notify & Report | events + queries | notifications, PDF/Excel |

```mermaid
flowchart TD
  subgraph P1[1.0 Auth]
    A1[Login JWT RBAC]
  end
  subgraph P2[2.0 Master Data]
    A2[Admin CRUD]
  end
  subgraph P3[3.0 Detect]
    A3[YOLO OCR Rules]
  end
  subgraph P4[4.0 Review Fine]
    A4[Officer Approve]
  end
  subgraph P5[5.0 Driver]
    A5[Pay / Appeal]
  end
  subgraph P6[6.0 Notify Report]
    A6[Notify + Analytics]
  end
  A1 --> A2
  A1 --> A3
  A3 --> A4
  A4 --> A5
  A4 --> A6
  A5 --> A6
```

---

## 16. BPMN-style lane summary (thesis)

| Lane | Activities |
|------|------------|
| **AI Engine** | Ingest frame → detect vehicle/sign/plate → OCR → suggest violation → write log |
| **Police** | Select source → run detect → review → approve/reject → issue fine → review appeal |
| **Driver** | Receive notice → view evidence → pay or appeal → receive outcome |
| **Admin** | Configure data/AI → oversee violations/fines → report → backup/settings |
| **System** | JWT/RBAC · notifications · audit · exports |

---

## 17. Demo path (follow this workflow live)

1. **Admin** — login → dashboard KPIs → signs/cameras/AI metrics  
2. **Police** — upload image/video or webcam → review boxes + OCR → approve → issue fine  
3. **Driver** — notification → evidence → KHQR/manual pay **or** appeal  
4. **Police** (if appeal) — approve/reject → notify driver  
5. **Admin** — reports PDF/Excel + audit log  

**Flags:** `AI_USE_MOCK=False`, all `VITE_*` demo/mock flags `false`.

---

*Master Build Prompt system workflow — documented for CamTraffic thesis Chapter 3–4.*
