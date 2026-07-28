# 🎓 Thesis Defense - Professional Workflow Diagrams Package

## For: "Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia"

**Total Diagrams:** 25+ professional workflow diagrams  
**Format:** Mermaid (convertible to PNG/SVG/PDF)  
**Purpose:** Thesis defense presentation

---

## 📋 Table of Contents

1. [Main System Workflow](#1-main-system-workflow)
2. [AI Detection Pipeline](#2-ai-detection-pipeline)
3. [Administrator Workflow](#3-administrator-workflow)
4. [Police Officer Workflow](#4-police-officer-workflow)
5. [Driver Workflow](#5-driver-workflow)
6. [Camera Management Workflow](#6-camera-management-workflow)
7. [Violation Processing Workflow](#7-violation-processing-workflow)
8. [Fine Management Workflow](#8-fine-management-workflow)
9. [Appeal Process Workflow](#9-appeal-process-workflow)
10. [Notification Workflow](#10-notification-workflow)
11. [OCR Process Workflow](#11-ocr-process-workflow)
12. [Report Generation Workflow](#12-report-generation-workflow)
13. [Authentication Flow](#13-authentication-flow)
14. [Image Upload Detection](#14-image-upload-detection)
15. [Video Upload Detection](#15-video-upload-detection)
16. [Live Camera Detection](#16-live-camera-detection)
17. [Webcam Detection](#17-webcam-detection)
18. [AI Model Training](#18-ai-model-training)
19. [Database Relationships](#19-database-relationships)
20. [API Request Flow](#20-api-request-flow)
21. [Payment Processing](#21-payment-processing)
22. [Vehicle Registration](#22-vehicle-registration)
23. [System Deployment](#23-system-deployment)
24. [Security Architecture](#24-security-architecture)
25. [Complete System Architecture](#25-complete-system-architecture)

---

## 1. Main System Workflow

```mermaid
graph TD
    A[Camera Captures Frame] --> B[Frame Preprocessing]
    B --> C[YOLOv8 AI Detection]
    C --> D[Traffic Sign Detection]
    C --> E[Vehicle Detection]
    C --> F[License Plate Detection]
    F --> G[EasyOCR Text Extraction]
    G --> H[Rule Engine Evaluation]
    H --> I{Violation Detected?}
    I -->|Yes| J[Generate Violation Case]
    I -->|No| K[Log Detection Only]
    J --> L[Save Evidence Images]
    L --> M[Notify Police Officer]
    M --> N{Police Review}
    N -->|Approve| O[Create Fine]
    N -->|Reject| P[Close Case]
    O --> Q[Notify Driver]
    Q --> R{Driver Response}
    R -->|Pay Fine| S[Complete Payment]
    R -->|Appeal| T[Appeal Review]
    T --> U{Appeal Decision}
    U -->|Approved| V[Cancel Fine]
    U -->|Rejected| O
    S --> W[Case Closed]
    V --> W
    P --> W
    K --> X[Analytics Dashboard]
    W --> X
```

**Purpose:** Overview of complete system from camera capture to case closure  
**Actors:** Camera, AI System, Police Officer, Driver  
**Key Decision Points:** Violation detection, Police review, Driver response, Appeal decision

---

## 2. AI Detection Pipeline

```mermaid
graph LR
    A[Input Image/Video] --> B[OpenCV Preprocessing]
    B --> C[Resize to 640x640]
    C --> D[Normalize Pixel Values]
    D --> E[CLAHE Contrast Enhancement]
    E --> F[YOLOv8 Model Inference]
    F --> G[Traffic Sign Model]
    F --> H[Vehicle Model]
    F --> I[Plate Detection Model]
    G --> J[Sign Classification]
    H --> K[Vehicle Classification]
    I --> L[Plate Bounding Box]
    L --> M[Crop Plate Region]
    M --> N[EasyOCR Recognition]
    N --> O[Plate Text Extraction]
    J --> P[Combine Results]
    K --> P
    O --> P
    P --> Q[Confidence Filtering]
    Q --> R[Draw Annotations]
    R --> S[Output Annotated Image]
    P --> T[Return Detection Data]
```

**Purpose:** Detailed AI detection process from input to output  
**Technologies:** OpenCV, YOLOv8, EasyOCR  
**Output:** Annotated image + detection data (JSON)

---

## 3. Administrator Workflow

```mermaid
graph TD
    A[Admin Login] --> B[Dashboard]
    B --> C{Select Task}
    C --> D[Manage Users]
    C --> E[Manage Cameras]
    C --> F[Manage Roads]
    C --> G[Manage Traffic Signs]
    C --> H[View Violations]
    C --> I[View Reports]
    C --> J[System Settings]
    
    D --> D1[Create User]
    D --> D2[Edit User]
    D --> D3[Delete User]
    D --> D4[Assign Roles]
    
    E --> E1[Add Camera]
    E --> E2[Edit Camera]
    E --> E3[Assign to Road]
    E --> E4[Monitor Status]
    
    F --> F1[Add Road]
    F --> F2[Edit Road]
    F --> F3[Assign Speed Limit]
    
    G --> G1[Upload Sign Images]
    G --> G2[Train AI Model]
    G --> G3[Test Detection]
    
    H --> H1[View All Violations]
    H --> H2[Filter by Status]
    H --> H3[Export Data]
    
    I --> I1[Daily Reports]
    I --> I2[Monthly Reports]
    I --> I3[Analytics Dashboard]
    
    J --> J1[Email Settings]
    J --> J2[AI Model Config]
    J --> J3[System Backup]
```

**Purpose:** Admin portal navigation and management tasks  
**Key Features:** User management, Camera management, System configuration

---

## 4. Police Officer Workflow

```mermaid
graph TD
    A[Officer Login] --> B[Dashboard]
    B --> C{Select Task}
    C --> D[View Live Cameras]
    C --> E[AI Detection]
    C --> F[Review Violations]
    C --> G[Review Appeals]
    C --> H[View Reports]
    
    D --> D1[Select Camera]
    D1 --> D2[View Live Feed]
    D2 --> D3[Capture Frame]
    D3 --> E
    
    E --> E1[Upload Image]
    E --> E2[Upload Video]
    E --> E3[Use Webcam]
    E --> E4[Select Live Camera]
    E1 --> E5[Run Detection]
    E2 --> E5
    E3 --> E5
    E4 --> E5
    E5 --> E6[View Results]
    E6 --> E7{Create Violation?}
    E7 -->|Yes| E8[Create Violation Case]
    E7 -->|No| B
    
    F --> F1[Pending Violations]
    F1 --> F2[View Details]
    F2 --> F3{Decision}
    F3 -->|Approve| F4[Create Fine]
    F3 -->|Reject| F5[Close Case]
    F4 --> F6[Notify Driver]
    
    G --> G1[Pending Appeals]
    G1 --> G2[View Evidence]
    G2 --> G3{Decision}
    G3 -->|Approve| G4[Cancel Fine]
    G3 -->|Reject| G5[Maintain Fine]
    
    H --> H1[Officer Statistics]
    H --> H2[Violation Trends]
    H --> H3[Export Reports]
```

**Purpose:** Police officer daily workflow from login to case management  
**Key Features:** Live camera monitoring, AI detection, Violation review, Appeal handling

---

## 5. Driver Workflow

```mermaid
graph TD
    A[Driver Registration] --> B[Email Verification]
    B --> C[Login]
    C --> D[Dashboard]
    D --> E{Select Task}
    E --> F[My Vehicles]
    E --> G[My Violations]
    E --> H[My Fines]
    E --> I[My Appeals]
    E --> J[Notifications]
    
    F --> F1[Register Vehicle]
    F1 --> F2[Upload Documents]
    F2 --> F3[Submit for Verification]
    F3 --> F4[Approved]
    
    G --> G1[View Violations List]
    G1 --> G2[Click Violation]
    G2 --> G3[View Details]
    G3 --> G4[View Evidence Photos]
    G4 --> G5{Action}
    G5 -->|Accept| G6[Pay Fine]
    G5 -->|Disagree| G7[File Appeal]
    
    H --> H1[Pending Fines]
    H --> H2[Select Payment Method]
    H2 --> H3[Credit Card]
    H2 --> H4[Bank Transfer]
    H2 --> H5[Mobile Payment]
    H3 --> H6[Payment Gateway]
    H4 --> H6
    H5 --> H6
    H6 --> H7[Payment Confirmed]
    H7 --> H8[Fine Paid]
    
    I --> I1[File New Appeal]
    I1 --> I2[Upload Evidence]
    I2 --> I3[Submit Appeal]
    I3 --> I4[Wait for Review]
    I4 --> I5{Appeal Decision}
    I5 -->|Approved| I6[Fine Cancelled]
    I5 -->|Rejected| H1
    
    J --> J1[Violation Notifications]
    J --> J2[Fine Notifications]
    J --> J3[Appeal Updates]
```

**Purpose:** Driver portal workflow from registration to violation resolution  
**Key Features:** Vehicle registration, Violation viewing, Fine payment, Appeal submission

---

## 6. Camera Management Workflow

```mermaid
graph TD
    A[Add New Camera] --> B[Enter Camera Details]
    B --> C[Camera Name]
    B --> D[Camera Code]
    B --> E[Stream URL/RTSP]
    B --> F[Assign to Road]
    B --> G[GPS Coordinates]
    
    C --> H[Save Camera]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I{Camera Status}
    I -->|Active| J[Start Monitoring]
    I -->|Inactive| K[Manual Activation]
    
    J --> L[Periodic Frame Capture]
    L --> M[Every 30 seconds]
    M --> N[Capture Frame via RTSP/HTTP]
    N --> O{Capture Success?}
    O -->|Yes| P[Send to AI Detection]
    O -->|No| Q[Log Error]
    Q --> R[Retry in 60s]
    R --> N
    
    P --> S[AI Detection Pipeline]
    S --> T[Save Detection Log]
    T --> U{Violation Detected?}
    U -->|Yes| V[Create Violation Case]
    U -->|No| W[Update Dashboard Stats]
    V --> X[Notify Police]
    
    K --> Y[Admin Enables Camera]
    Y --> J
```

**Purpose:** Camera setup and automated monitoring process  
**Key Features:** Camera configuration, RTSP capture, Automated detection

---

## 7. Violation Processing Workflow

```mermaid
graph TD
    A[Detection Complete] --> B{Violation Rules Check}
    B --> C[Match Traffic Sign]
    B --> D[Match Vehicle]
    B --> E[Match Location/Road]
    
    C --> F{Rule Match Found?}
    F -->|Yes| G[Get Violation Type]
    F -->|No| H[No Violation]
    
    G --> I[NO_PARKING]
    G --> J[NO_ENTRY]
    G --> K[SPEEDING]
    G --> L[HELMET_VIOLATION]
    G --> M[RUNNING_RED_LIGHT]
    G --> N[WRONG_DIRECTION]
    
    I --> O[Create Violation Case]
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O
    
    O --> P[Set Status: draft]
    P --> Q[Save Evidence Images]
    Q --> R[Vehicle Snapshot]
    Q --> S[Plate Snapshot]
    Q --> T[Sign Snapshot]
    Q --> U[Annotated Frame]
    
    R --> V[Attach to Violation]
    S --> V
    T --> V
    U --> V
    
    V --> W[Lookup Vehicle Owner]
    W --> X{Owner Found?}
    X -->|Yes| Y[Assign to Driver]
    X -->|No| Z[Mark as Unknown Vehicle]
    
    Y --> AA[Set Status: pending_review]
    Z --> AB[Queue for Officer Review]
    AA --> AC[Notify Police Officer]
    AB --> AC
    AC --> AD[Await Police Decision]
    
    H --> AE[Log Detection Only]
```

**Purpose:** Automated violation detection and case creation  
**Key Decision Points:** Rule matching, Vehicle lookup, Status assignment

---

## 8. Fine Management Workflow

```mermaid
graph TD
    A[Violation Approved by Police] --> B[Calculate Fine Amount]
    B --> C[Check Violation Type]
    C --> D[Get Base Fine Amount]
    D --> E[Apply Multipliers]
    E --> F[Previous Violations?]
    F -->|Yes| G[Add 20% Penalty]
    F -->|No| H[Keep Base Amount]
    G --> I[Create Fine Record]
    H --> I
    
    I --> J[Set Due Date: 30 days]
    J --> K[Set Status: pending]
    K --> L[Generate Fine Number]
    L --> M[Send Notification to Driver]
    
    M --> N{Driver Action}
    N -->|Pay Immediately| O[Payment Process]
    N -->|Appeal| P[Suspend Fine]
    N -->|Ignore| Q[Wait for Due Date]
    
    O --> R[Payment Gateway]
    R --> S{Payment Success?}
    S -->|Yes| T[Mark Fine as Paid]
    S -->|No| U[Retry Payment]
    T --> V[Send Payment Receipt]
    V --> W[Close Violation Case]
    
    P --> X[Appeal Review]
    X --> Y{Appeal Decision}
    Y -->|Approved| Z[Cancel Fine]
    Y -->|Rejected| AA[Resume Fine]
    Z --> W
    AA --> N
    
    Q --> AB{Due Date Passed?}
    AB -->|No| Q
    AB -->|Yes| AC[Add Late Fee: 10%]
    AC --> AD[Update Fine Amount]
    AD --> AE[Send Warning]
    AE --> AF[Set Status: overdue]
    AF --> AG[Escalate to Legal]
```

**Purpose:** Fine calculation, payment tracking, and escalation  
**Key Features:** Dynamic fine calculation, Payment processing, Late fee application

---

## 9. Appeal Process Workflow

```mermaid
graph TD
    A[Driver Files Appeal] --> B[Appeal Form]
    B --> C[Select Violation]
    B --> D[Provide Reason]
    B --> E[Upload Evidence]
    B --> F[Submit Appeal]
    
    C --> G[Submit]
    D --> G
    E --> G
    F --> G
    
    G --> H[Create Appeal Record]
    H --> I[Set Status: submitted]
    I --> J[Suspend Fine Payment]
    J --> K[Assign to Police Officer]
    K --> L[Send Notification to Officer]
    
    L --> M[Officer Reviews Appeal]
    M --> N[View Original Violation]
    M --> O[View AI Detection Evidence]
    M --> P[View Driver's Evidence]
    M --> Q[Review Reason]
    
    N --> R{Officer Decision}
    O --> R
    P --> R
    Q --> R
    
    R -->|Approve| S[Set Status: approved]
    R -->|Reject| T[Set Status: rejected]
    R -->|Need More Info| U[Request More Evidence]
    
    S --> V[Cancel Fine]
    V --> W[Close Violation]
    W --> X[Notify Driver: Appeal Approved]
    
    T --> Y[Maintain Fine]
    Y --> Z[Resume Fine Payment]
    Z --> AA[Notify Driver: Appeal Rejected]
    
    U --> AB[Send Message to Driver]
    AB --> AC[Driver Provides More Info]
    AC --> M
    
    X --> AD[Appeal Complete]
    AA --> AD
```

**Purpose:** Appeal submission, review, and resolution process  
**Key Features:** Evidence upload, Police review, Status updates, Notifications

---

## 10. Notification Workflow

```mermaid
graph TD
    A[System Event Trigger] --> B{Event Type}
    B --> C[Violation Created]
    B --> D[Fine Issued]
    B --> E[Payment Received]
    B --> F[Appeal Filed]
    B --> G[Appeal Decided]
    B --> H[Fine Overdue]
    
    C --> I[Determine Recipients]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J[Police Officers]
    I --> K[Driver]
    I --> L[Admin]
    
    J --> M[Create Web Notification]
    K --> M
    L --> M
    
    M --> N[Save to Database]
    N --> O[Mark as Unread]
    O --> P[Display in UI]
    
    M --> Q{Email Enabled?}
    Q -->|Yes| R[Prepare Email]
    Q -->|No| S[Skip Email]
    
    R --> T[Load Email Template]
    T --> U[Violation Notification]
    T --> V[Fine Notification]
    T --> W[Payment Confirmation]
    T --> X[Appeal Update]
    
    U --> Y[Populate Template Data]
    V --> Y
    W --> Y
    X --> Y
    
    Y --> Z[Send Email via SMTP]
    Z --> AA{Email Sent?}
    AA -->|Yes| AB[Log Success]
    AA -->|No| AC[Log Error]
    AC --> AD[Retry in 5 min]
    
    M --> AE{SMS Enabled?}
    AE -->|Yes| AF[Send SMS]
    AE -->|No| AG[Skip SMS]
    
    P --> AH[User Views Notification]
    AH --> AI[Mark as Read]
```

**Purpose:** Multi-channel notification delivery system  
**Channels:** Web, Email, SMS (planned)  
**Key Features:** Template-based emails, Retry mechanism, Read status tracking

---

## 11. OCR Process Workflow

```mermaid
graph TD
    A[Vehicle Detected] --> B[Extract Vehicle Bounding Box]
    B --> C[Detect Plate Region]
    C --> D{Plate Found?}
    D -->|No| E[Return No Plate]
    D -->|Yes| F[Crop Plate Region]
    
    F --> G[Image Enhancement]
    G --> H[Convert to Grayscale]
    H --> I[Apply Gaussian Blur]
    I --> J[Adaptive Thresholding]
    J --> K[Noise Removal]
    K --> L[Contrast Enhancement]
    
    L --> M[EasyOCR Recognition]
    M --> N[Multiple Reads: 3x]
    N --> O[Read 1]
    N --> P[Read 2]
    N --> Q[Read 3]
    
    O --> R[Collect Results]
    P --> R
    Q --> R
    
    R --> S[Consensus Algorithm]
    S --> T[Compare Reads]
    T --> U{Majority Match?}
    U -->|Yes| V[Return Consensus Text]
    U -->|No| W[Return Best Confidence]
    
    V --> X[Validate Plate Format]
    W --> X
    
    X --> Y[Cambodian Format: XX-XXXX]
    Y --> Z{Valid Format?}
    Z -->|Yes| AA[Extract Province Code]
    Z -->|No| AB[Return Raw Text]
    
    AA --> AC[PP: Phnom Penh]
    AA --> AD[KM: Kampong Cham]
    AA --> AE[SR: Siem Reap]
    AA --> AF[BT: Battambang]
    
    AC --> AG[Database Lookup]
    AD --> AG
    AE --> AG
    AF --> AG
    AB --> AG
    
    AG --> AH{Vehicle Found?}
    AH -->|Yes| AI[Return Vehicle + Owner Info]
    AH -->|No| AJ[Return Plate Text Only]
```

**Purpose:** License plate text extraction and vehicle lookup  
**Technology:** EasyOCR with multiple reads for accuracy  
**Key Features:** Image enhancement, Consensus algorithm, Province detection, Database lookup

---

## 12. Report Generation Workflow

```mermaid
graph TD
    A[User Requests Report] --> B{Report Type}
    B --> C[Daily Report]
    B --> D[Monthly Report]
    B --> E[Yearly Report]
    B --> F[Custom Range]
    
    C --> G[Set Date Range: Today]
    D --> H[Set Date Range: This Month]
    E --> I[Set Date Range: This Year]
    F --> J[User Selects Dates]
    
    G --> K[Query Database]
    H --> K
    I --> K
    J --> K
    
    K --> L[Aggregate Violations]
    L --> M[Group by Type]
    L --> N[Group by Road]
    L --> O[Group by Camera]
    L --> P[Group by Status]
    
    M --> Q[Calculate Statistics]
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[Total Violations]
    Q --> S[Confirmed Violations]
    Q --> T[Pending Violations]
    Q --> U[Rejected Violations]
    Q --> V[Total Fines Issued]
    Q --> W[Total Fines Paid]
    Q --> X[Total Fines Outstanding]
    Q --> Y[Appeal Rate]
    
    R --> Z[Generate Charts]
    S --> Z
    T --> Z
    U --> Z
    V --> Z
    W --> Z
    X --> Z
    Y --> Z
    
    Z --> AA[Bar Charts]
    Z --> AB[Line Charts]
    Z --> AC[Pie Charts]
    Z --> AD[Heatmaps]
    
    AA --> AE{Export Format}
    AB --> AE
    AC --> AE
    AD --> AE
    
    AE --> AF[View in Dashboard]
    AE --> AG[Export PDF]
    AE --> AH[Export Excel]
    AE --> AI[Export CSV]
    
    AG --> AJ[Download File]
    AH --> AJ
    AI --> AJ
```

**Purpose:** Comprehensive reporting and data export  
**Report Types:** Daily, Monthly, Yearly, Custom  
**Export Formats:** PDF, Excel, CSV  
**Key Metrics:** Violations, Fines, Appeals, Trends

---

## 13. Authentication Flow

```mermaid
graph TD
    A[User Opens Application] --> B{Has Access Token?}
    B -->|Yes| C[Validate Token]
    B -->|No| D[Show Login Page]
    
    C --> E{Token Valid?}
    E -->|Yes| F[Load Dashboard]
    E -->|No| G[Refresh Token]
    
    G --> H{Refresh Success?}
    H -->|Yes| I[Get New Access Token]
    H -->|No| D
    I --> F
    
    D --> J[User Enters Credentials]
    J --> K[Email/Phone]
    J --> L[Password]
    
    K --> M[Submit Login]
    L --> M
    
    M --> N[POST /api/auth/login/]
    N --> O[Django Backend]
    O --> P[Validate Credentials]
    P --> Q{Valid?}
    Q -->|Yes| R[Check User Role]
    Q -->|No| S[Return Error]
    S --> T[Show Error Message]
    T --> D
    
    R --> U[Admin]
    R --> V[Police]
    R --> W[Driver]
    
    U --> X[Generate JWT Tokens]
    V --> X
    W --> X
    
    X --> Y[Access Token: 1 hour]
    X --> Z[Refresh Token: 30 days]
    
    Y --> AA[Return Tokens + User Data]
    Z --> AA
    
    AA --> AB[Store in LocalStorage]
    AB --> AC[Set Authorization Header]
    AC --> AD[Redirect to Dashboard]
    
    AD --> AE[Admin Dashboard]
    AD --> AF[Police Dashboard]
    AD --> AG[Driver Dashboard]
    
    F --> AH{Token Expires During Session}
    AH -->|Yes| G
```

**Purpose:** Secure authentication with JWT tokens  
**Token Types:** Access (1 hour), Refresh (30 days)  
**Roles:** Admin, Police Officer, Driver  
**Security Features:** Token refresh, Role-based access

---

## 14. Image Upload Detection

```mermaid
graph TD
    A[User Opens AI Detection Page] --> B[Select Upload Image Tab]
    B --> C{Upload Method}
    C --> D[Click to Browse]
    C --> E[Drag and Drop]
    
    D --> F[File Dialog]
    F --> G[Select Image]
    E --> H[Drop Image]
    G --> I[Validate File]
    H --> I
    
    I --> J{Valid Image?}
    J -->|No| K[Show Error]
    J -->|Yes| L[Convert to JPEG]
    K --> B
    
    L --> M[Show Preview]
    M --> N[User Clicks Detect]
    N --> O[Show Progress Bar]
    O --> P[POST /api/ai/detect/]
    
    P --> Q[Backend Receives Image]
    Q --> R[Save to Temp File]
    R --> S[Prepare Detection Image]
    S --> T[Run Detection Pipeline]
    T --> U[YOLOv8 Inference]
    U --> V[Detect Signs]
    U --> W[Detect Vehicles]
    U --> X[Detect Plates]
    
    V --> Y[Draw Annotations]
    W --> Y
    X --> Y
    
    Y --> Z[Green Bounding Boxes]
    Y --> AA[Text Labels]
    Y --> AB[Confidence Scores]
    
    Z --> AC[Save Annotated Image]
    AA --> AC
    AB --> AC
    
    AC --> AD[Create Detection Log]
    AD --> AE[Save to Database]
    AE --> AF[Return JSON Response]
    
    AF --> AG[Frontend Receives Result]
    AG --> AH[Display Annotated Image]
    AH --> AI[Show Detection Details]
    AI --> AJ[Sign Name]
    AI --> AK[Vehicle Count]
    AI --> AL[Plate Number]
    AI --> AM[Confidence Scores]
    
    AJ --> AN[Success Notification]
    AK --> AN
    AL --> AN
    AM --> AN
```

**Purpose:** Single image upload and AI detection  
**Processing Time:** 2-5 seconds  
**Output:** Annotated image with bounding boxes and labels  
**Key Features:** Drag-drop upload, Real-time progress, Detailed results

---

## 15. Video Upload Detection

```mermaid
graph TD
    A[User Opens AI Detection Center] --> B[Select Video Tab]
    B --> C{Upload Video}
    C --> D[Click to Browse]
    C --> E[Drag and Drop]
    
    D --> F[File Dialog]
    F --> G[Select Video: MP4/WEBM/MOV]
    E --> H[Drop Video]
    G --> I[Validate Video]
    H --> I
    
    I --> J{Valid Video & Size < 500MB?}
    J -->|No| K[Show Error]
    J -->|Yes| L[Show Video Preview]
    K --> B
    
    L --> M[Configure Settings]
    M --> N[Confidence Threshold: 0.35]
    M --> O[Max Frames: 12]
    M --> P[Enable OCR: Off/On]
    M --> Q[Enable Tracking: Off/On]
    
    N --> R[User Clicks Detect]
    O --> R
    P --> R
    Q --> R
    
    R --> S[Show Processing Status]
    S --> T[POST /api/ai/detect-video/]
    T --> U[Backend Receives Video]
    U --> V[Save to Temp File]
    V --> W[Extract Frames: 12 evenly spaced]
    
    W --> X[Frame 1: 0.0s]
    W --> Y[Frame 2: 0.9s]
    W --> Z[Frame 3: 1.7s]
    W --> AA[... Frame 12: 9.5s]
    
    X --> AB[Process Each Frame]
    Y --> AB
    Z --> AB
    AA --> AB
    
    AB --> AC[For Each Frame:]
    AC --> AD[Run Detection Pipeline]
    AD --> AE[YOLOv8 Inference]
    AE --> AF[Detect Signs/Vehicles/Plates]
    AF --> AG[Draw Annotations]
    AG --> AH[Save Annotated Frame]
    
    AH --> AI[Select Best Frame]
    AI --> AJ[Highest Confidence]
    AI --> AK[Most Vehicles]
    AI --> AL[Has Violations]
    
    AJ --> AM[Run OCR on Best Frame]
    AK --> AM
    AL --> AM
    
    AM --> AN[Build Annotated Video]
    AN --> AO[Stitch 12 Frames]
    AO --> AP[Create MP4: 2 FPS]
    AP --> AQ[Save Preview Video]
    
    AQ --> AR[Create Detection Log]
    AR --> AS[Return JSON Response]
    AS --> AT[annotated_preview_video]
    AS --> AU[video_analysis]
    AS --> AV[frame_summaries]
    
    AT --> AW[Display Preview Video]
    AU --> AX[Display Timeline]
    AV --> AY[Display Statistics]
    
    AW --> AZ[User Plays Video]
    AX --> BA[Click Frames]
    AY --> BB[View Metrics]
```

**Purpose:** Video upload with frame-by-frame detection  
**Processing Time:** 15-20 seconds (12 frames)  
**Output:** Annotated MP4 preview + frame timeline  
**Key Features:** Configurable settings, Best frame selection, Timeline navigation

---

## 16. Live Camera Detection

```mermaid
graph TD
    A[System Monitors Cameras] --> B[Get Active Cameras List]
    B --> C[For Each Camera:]
    C --> D{Camera Active?}
    D -->|No| E[Skip]
    D -->|Yes| F[Check Last Capture Time]
    
    F --> G{> 30 seconds ago?}
    G -->|No| H[Wait]
    G -->|Yes| I[Capture Frame]
    
    I --> J{Stream Type}
    J --> K[RTSP Stream]
    J --> L[HTTP/HTTPS URL]
    J --> M[Local File Path]
    
    K --> N[OpenCV VideoCapture]
    L --> O[HTTP Request]
    M --> P[Read File]
    
    N --> Q[Extract Frame]
    O --> Q
    P --> Q
    
    Q --> R{Capture Success?}
    R -->|No| S[Log Error]
    R -->|Yes| T[Save Frame to Temp]
    S --> U[Retry in 60s]
    U --> I
    
    T --> V[Run Detection Pipeline]
    V --> W[YOLOv8 Inference]
    W --> X[Detect Objects]
    X --> Y[Evaluate Rules]
    Y --> Z{Violation?}
    
    Z -->|No| AA[Save Detection Log Only]
    Z -->|Yes| AB[Create Violation Case]
    
    AB --> AC[Save Evidence Images]
    AC --> AD[Assign to Officer]
    AD --> AE[Send Notification]
    AE --> AF[Display in Dashboard]
    
    AA --> AG[Update Statistics]
    AF --> AG
    
    AG --> AH[Next Camera]
    AH --> C
    
    E --> AH
    H --> AH
```

**Purpose:** Automated camera monitoring and detection  
**Frequency:** Every 30 seconds per camera  
**Key Features:** Multi-protocol support (RTSP/HTTP/File), Auto violation creation, Error handling and retry

---

## 17. Webcam Detection

```mermaid
graph TD
    A[User Opens AI Detection] --> B[Select Webcam Tab]
    B --> C[Request Camera Permission]
    C --> D{Permission Granted?}
    D -->|No| E[Show Error]
    D -->|Yes| F[Initialize Webcam]
    
    F --> G[Display Live Feed]
    G --> H{Detection Mode}
    H --> I[Live Preview: Boxes Only]
    H --> J[Scan & Save: Full Detection]
    
    I --> K[User Clicks Preview]
    K --> L[Capture Frame from Stream]
    L --> M[POST /api/ai/detect/]
    M --> N[Fast Detection: No OCR]
    N --> O[Return Bounding Boxes]
    O --> P[Display as CSS Overlays]
    P --> Q[Loop Every 2 seconds]
    Q --> K
    
    J --> R[User Clicks Scan & Save]
    R --> S[Capture High Quality Frame]
    S --> T[POST /api/ai/detect/]
    T --> U[Full Detection: With OCR]
    U --> V[Save Detection Log]
    V --> W[Return Complete Result]
    W --> X[Display Annotated Image]
    X --> Y[Show All Details]
    Y --> Z[Sign Name]
    Y --> AA[Vehicles]
    Y --> AB[Plate Number]
    Y --> AC[Create Violation Option]
    
    AC --> AD{Create Violation?}
    AD -->|Yes| AE[Violation Form]
    AD -->|No| AF[Continue Preview]
    AF --> K
    
    AE --> AG[Select Violation Type]
    AG --> AH[Add Notes]
    AH --> AI[Submit]
    AI --> AJ[Create Violation Case]
    AJ --> AK[Success Message]
```

**Purpose:** Real-time webcam detection with two modes  
**Modes:** Live Preview (fast, boxes only), Scan & Save (full detection)  
**Key Features:** Permission handling, Live overlay, Violation creation

---

## 18. AI Model Training

```mermaid
graph TD
    A[Start Model Training] --> B[Collect Training Data]
    B --> C[Data Sources]
    C --> D[Cambodian Traffic Signs]
    C --> E[Vehicles on Roads]
    C --> F[License Plates]
    C --> G[Street Scenes]
    
    D --> H[Label Dataset]
    E --> H
    F --> H
    G --> H
    
    H --> I[Use Annotation Tool]
    I --> J[Roboflow]
    I --> K[LabelImg]
    I --> L[CVAT]
    
    J --> M[Export YOLO Format]
    K --> M
    L --> M
    
    M --> N[Create Dataset Structure]
    N --> O[train/ folder]
    N --> P[val/ folder]
    N --> Q[test/ folder]
    N --> R[data.yaml config]
    
    O --> S[Train YOLO Model]
    P --> S
    Q --> S
    R --> S
    
    S --> T[Configure Training]
    T --> U[Model: YOLOv8n/s/m/l/x]
    T --> V[Epochs: 100-300]
    T --> W[Image Size: 640]
    T --> X[Batch Size: 16-32]
    T --> Y[Device: GPU/CPU]
    
    U --> Z[Start Training]
    V --> Z
    W --> Z
    X --> Z
    Y --> Z
    
    Z --> AA[Training Loop]
    AA --> AB[Epoch 1]
    AA --> AC[Epoch 2]
    AA --> AD[...]
    AA --> AE[Epoch 100]
    
    AB --> AF[Calculate Metrics]
    AC --> AF
    AD --> AF
    AE --> AF
    
    AF --> AG[Precision]
    AF --> AH[Recall]
    AF --> AI[mAP@0.5]
    AF --> AJ[mAP@0.5:0.95]
    
    AG --> AK{Metrics Good?}
    AH --> AK
    AI --> AK
    AJ --> AK
    
    AK -->|No| AL[Adjust Hyperparameters]
    AK -->|Yes| AM[Save Best Model]
    AL --> Z
    
    AM --> AN[best.pt file]
    AN --> AO[Test on Validation Set]
    AO --> AP[Generate Confusion Matrix]
    AP --> AQ[Analyze Results]
    
    AQ --> AR{Satisfactory?}
    AR -->|No| AS[Collect More Data]
    AR -->|Yes| AT[Deploy Model]
    AS --> B
    
    AT --> AU[Copy to ai/weights/]
    AU --> AV[Update Model Config]
    AV --> AW[Restart Backend]
    AW --> AX[Model Ready for Production]
```

**Purpose:** Complete AI model training and deployment workflow  
**Tools:** YOLOv8, Roboflow, LabelImg  
**Key Metrics:** Precision, Recall, mAP  
**Deployment:** Copy weights to production folder

---

## 19. Database Relationships

```mermaid
erDiagram
    User ||--o{ Driver : "has profile"
    User ||--o{ Officer : "has profile"
    User ||--o{ AIDetectionLog : "creates"
    User ||--o{ Notification : "receives"
    
    Driver ||--o{ Vehicle : "owns"
    Driver ||--o{ TrafficViolation : "receives"
    
    Officer ||--o{ TrafficViolation : "reviews"
    Officer ||--|| PoliceStation : "assigned to"
    
    Vehicle ||--o{ TrafficViolation : "involved in"
    
    Camera ||--o{ AIDetectionLog : "captures"
    Camera ||--|| Road : "monitors"
    
    Road ||--o{ TrafficViolation : "occurs on"
    Road ||--|| Province : "located in"
    
    AIDetectionLog ||--o| TrafficViolation : "creates"
    AIDetectionLog ||--o| Vehicle : "detected"
    
    TrafficViolation ||--o| Fine : "generates"
    TrafficViolation ||--o{ Appeal : "appeals"
    
    Fine ||--o{ PaymentTransaction : "paid via"
    
    ViolationRule ||--o{ TrafficViolation : "defines"
    TrafficSign ||--o{ ViolationRule : "associated with"
```

**Purpose:** Database entity relationships (ERD)  
**Key Entities:** User, Driver, Officer, Vehicle, Camera, Violation, Fine  
**Relationships:** One-to-Many, Many-to-One, One-to-One

---

## 20. API Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant React
    participant Axios
    participant Django
    participant AI
    participant DB
    
    Browser->>React: User Action (e.g., Click Detect)
    React->>React: Prepare Request Data
    React->>Axios: POST /api/ai/detect/
    Axios->>Axios: Add JWT Token to Header
    Axios->>Django: HTTP Request
    
    Django->>Django: Validate JWT Token
    alt Token Invalid
        Django-->>Axios: 401 Unauthorized
        Axios-->>React: Error Response
        React-->>Browser: Show Login Page
    else Token Valid
        Django->>Django: Check User Permissions
        alt No Permission
            Django-->>Axios: 403 Forbidden
            Axios-->>React: Error Response
            React-->>Browser: Show Error Message
        else Has Permission
            Django->>Django: Parse Request Data
            Django->>AI: Run Detection Pipeline
            AI->>AI: Load YOLO Models
            AI->>AI: Run Inference
            AI->>AI: Draw Annotations
            AI-->>Django: Detection Results
            
            Django->>DB: Save Detection Log
            DB-->>Django: Log Saved
            
            Django->>Django: Serialize Response
            Django-->>Axios: 200 OK + JSON Data
            Axios-->>React: Success Response
            React->>React: Update State
            React-->>Browser: Display Results
        end
    end
```

**Purpose:** Complete API request lifecycle  
**Security:** JWT token validation and permissions  
**Components:** Frontend (React) → API (Django) → AI Service → Database

---

## 21. Payment Processing

```mermaid
graph TD
    A[Driver Views Fine] --> B[Click Pay Fine]
    B --> C[Payment Form]
    C --> D{Select Payment Method}
    D --> E[Credit/Debit Card]
    D --> F[Bank Transfer]
    D --> G[Mobile Wallet]
    D --> H[Cash at Office]
    
    E --> I[Enter Card Details]
    I --> J[Card Number]
    I --> K[Expiry Date]
    I --> L[CVV]
    J --> M[Submit Payment]
    K --> M
    L --> M
    
    F --> N[Generate Payment Reference]
    N --> O[Show Bank Details]
    O --> P[User Transfers Money]
    P --> Q[Upload Receipt]
    Q --> R[Submit for Verification]
    
    G --> S[Mobile Wallet Selection]
    S --> T[ABA Pay]
    S --> U[Wing]
    S --> V[Pi Pay]
    T --> W[Redirect to App]
    U --> W
    V --> W
    W --> X[Complete Payment]
    X --> Y[Callback to System]
    
    H --> Z[Generate Payment Code]
    Z --> AA[Show Office Locations]
    AA --> AB[User Visits Office]
    AB --> AC[Officer Marks as Paid]
    
    M --> AD[Payment Gateway]
    AD --> AE[Stripe/PayPal Processing]
    AE --> AF{Payment Success?}
    AF -->|Yes| AG[Payment Confirmed]
    AF -->|No| AH[Payment Failed]
    AH --> AI[Show Error]
    AI --> C
    
    AG --> AJ[Create Payment Transaction]
    Y --> AJ
    R --> AK[Pending Verification]
    AC --> AJ
    
    AJ --> AL[Update Fine Status: paid]
    AL --> AM[Close Violation Case]
    AM --> AN[Generate Receipt]
    AN --> AO[Send Email Receipt]
    AO --> AP[Update Driver Dashboard]
    AP --> AQ[Success Notification]
    
    AK --> AR[Officer Reviews Receipt]
    AR --> AS{Verified?}
    AS -->|Yes| AJ
    AS -->|No| AT[Reject Payment]
    AT --> AU[Notify Driver]
    AU --> C
```

**Purpose:** Multi-method payment processing  
**Payment Methods:** Card, Bank Transfer, Mobile Wallet, Cash  
**Key Features:** Gateway integration, Receipt upload, Manual verification

---

## 22. Vehicle Registration

```mermaid
graph TD
    A[Driver Logs In] --> B[Navigate to My Vehicles]
    B --> C[Click Add Vehicle]
    C --> D[Vehicle Registration Form]
    D --> E[Enter Details]
    E --> F[Plate Number]
    E --> G[Vehicle Type]
    E --> H[Make & Model]
    E --> I[Color]
    E --> J[Year]
    E --> K[Upload Documents]
    
    K --> L[Vehicle Registration Card]
    K --> M[Insurance Document]
    K --> N[Photo of Vehicle]
    
    F --> O[Validate Input]
    G --> O
    H --> O
    I --> O
    J --> O
    L --> O
    M --> O
    N --> O
    
    O --> P{All Fields Valid?}
    P -->|No| Q[Show Validation Errors]
    P -->|Yes| R[Submit Registration]
    Q --> E
    
    R --> S[Create Vehicle Record]
    S --> T[Status: pending_verification]
    T --> U[Assign to Officer for Review]
    U --> V[Send Notification to Driver]
    V --> W[Wait for Verification]
    
    W --> X{Officer Reviews}
    X --> Y[View Vehicle Details]
    X --> Z[View Uploaded Documents]
    Y --> AA{Decision}
    Z --> AA
    
    AA -->|Approve| AB[Update Status: active]
    AA -->|Reject| AC[Update Status: rejected]
    AA -->|Request More Info| AD[Send Message to Driver]
    
    AB --> AE[Notify Driver: Approved]
    AC --> AF[Notify Driver: Rejected]
    AF --> AG[Show Rejection Reason]
    AG --> AH[Allow Re-submission]
    AH --> D
    
    AD --> AI[Driver Provides More Info]
    AI --> X
    
    AE --> AJ[Vehicle Active]
    AJ --> AK[Available for Violation Assignment]
```

**Purpose:** Driver vehicle registration and verification  
**Status Flow:** Pending → Active/Rejected  
**Key Features:** Document upload, Officer verification, Status notifications

---

## 23. System Deployment

```mermaid
graph TD
    A[Development Complete] --> B[Code Review]
    B --> C[Run Tests]
    C --> D{Tests Pass?}
    D -->|No| E[Fix Issues]
    E --> B
    D -->|Yes| F[Commit to Git]
    
    F --> G[Push to GitHub]
    G --> H[CI/CD Pipeline Triggered]
    H --> I[GitHub Actions]
    I --> J[Build Backend]
    I --> K[Build Frontend]
    
    J --> L[Run Backend Tests]
    K --> M[Run Frontend Tests]
    
    L --> N{Tests Pass?}
    M --> N
    N -->|No| O[Notify Developers]
    O --> E
    N -->|Yes| P[Build Docker Images]
    
    P --> Q[Django Backend Image]
    P --> R[React Admin Image]
    P --> S[React Driver Image]
    P --> T[React Officer Image]
    P --> U[PostgreSQL Image]
    P --> V[Redis Image]
    
    Q --> W[Push to Container Registry]
    R --> W
    S --> W
    T --> W
    U --> W
    V --> W
    
    W --> X{Deploy Target}
    X --> Y[Staging Server]
    X --> Z[Production Server]
    
    Y --> AA[Deploy to Staging]
    AA --> AB[Run Smoke Tests]
    AB --> AC{Tests Pass?}
    AC -->|No| O
    AC -->|Yes| AD[Staging Ready]
    AD --> AE[Manual Approval]
    AE --> Z
    
    Z --> AF[Production Deployment]
    AF --> AG[Blue-Green Deployment]
    AG --> AH[Deploy to Green Environment]
    AH --> AI[Health Check]
    AI --> AJ{Healthy?}
    AJ -->|No| AK[Rollback to Blue]
    AJ -->|Yes| AL[Switch Traffic to Green]
    AL --> AM[Monitor Metrics]
    AM --> AN{All OK?}
    AN -->|No| AK
    AN -->|Yes| AO[Deployment Complete]
    
    AK --> AP[Alert Team]
    AP --> E
```

**Purpose:** Automated deployment pipeline  
**Environments:** Development → Staging → Production  
**Strategy:** Blue-Green deployment for zero downtime  
**CI/CD:** GitHub Actions with automated tests

---

## 24. Security Architecture

```mermaid
graph TD
    A[User Access] --> B[HTTPS/TLS Layer]
    B --> C[Load Balancer]
    C --> D[Web Application Firewall: WAF]
    D --> E{Request Type}
    E --> F[Static Assets]
    E --> G[API Requests]
    
    F --> H[CDN: Cloudflare]
    H --> I[Cached Response]
    
    G --> J[Rate Limiting]
    J --> K{Rate OK?}
    K -->|No| L[429 Too Many Requests]
    K -->|Yes| M[Authentication Check]
    
    M --> N{Has JWT Token?}
    N -->|No| O[401 Unauthorized]
    N -->|Yes| P[Validate JWT]
    P --> Q{Token Valid?}
    Q -->|No| O
    Q -->|Yes| R[Check Permissions]
    
    R --> S{Role-Based Access}
    S --> T[Admin]
    S --> U[Police]
    S --> V[Driver]
    
    T --> W[Admin API Endpoints]
    U --> X[Police API Endpoints]
    V --> Y[Driver API Endpoints]
    
    W --> Z[Django Backend]
    X --> Z
    Y --> Z
    
    Z --> AA[SQL Injection Protection]
    AA --> AB[Parameterized Queries]
    AB --> AC[ORM Safety]
    
    Z --> AD[XSS Protection]
    AD --> AE[Input Sanitization]
    AE --> AF[Output Encoding]
    
    Z --> AG[CSRF Protection]
    AG --> AH[CSRF Token]
    AH --> AI[Token Validation]
    
    AC --> AJ[PostgreSQL Database]
    AI --> AJ
    AF --> AJ
    
    AJ --> AK[Encrypted at Rest]
    AK --> AL[Encrypted Connections]
    AL --> AM[Backup Encryption]
    
    Z --> AN[Media Files]
    AN --> AO[Cloudflare R2]
    AO --> AP[Signed URLs]
    AP --> AQ[Expiring Links]
    
    Z --> AR[Audit Logging]
    AR --> AS[All User Actions]
    AS --> AT[Timestamp + User + Action]
    AT --> AU[Tamper-Proof Logs]
```

**Purpose:** Multi-layer security architecture  
**Security Layers:** TLS, WAF, Rate limiting, Authentication, Authorization  
**Protections:** SQL Injection, XSS, CSRF, Encrypted data  
**Monitoring:** Audit logs, Access logs

---

## 25. Complete System Architecture

```mermaid
graph TB
    subgraph Users
        A1[Admin]
        A2[Police Officer]
        A3[Driver]
    end
    
    subgraph Frontend
        B1[Admin Portal<br/>React + Vite]
        B2[Police Portal<br/>React + Vite]
        B3[Driver Portal<br/>React + Vite]
    end
    
    subgraph API Gateway
        C1[HTTPS/TLS]
        C2[Load Balancer]
        C3[JWT Authentication]
    end
    
    subgraph Backend Services
        D1[Django REST API]
        D2[AI Detection Service<br/>YOLOv8]
        D3[OCR Service<br/>EasyOCR]
        D4[Notification Service]
        D5[Report Service]
        D6[Payment Gateway]
    end
    
    subgraph Data Layer
        E1[PostgreSQL<br/>Main Database]
        E2[Redis<br/>Cache & Queue]
        E3[Cloudflare R2<br/>Media Storage]
    end
    
    subgraph External Systems
        F1[RTSP Cameras]
        F2[Email Server<br/>SMTP]
        F3[SMS Gateway]
        F4[Payment Providers]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    
    B1 --> C1
    B2 --> C1
    B3 --> C1
    
    C1 --> C2
    C2 --> C3
    C3 --> D1
    
    D1 --> D2
    D1 --> D3
    D1 --> D4
    D1 --> D5
    D1 --> D6
    
    D1 --> E1
    D1 --> E2
    D1 --> E3
    
    D2 --> E3
    D3 --> E3
    
    F1 --> D2
    D4 --> F2
    D4 --> F3
    D6 --> F4
```

**Purpose:** Complete system architecture overview  
**Components:** 3 portals, 6 backend services, 3 data stores, 4 external integrations  
**Technologies:** React, Django, PostgreSQL, Redis, YOLOv8, EasyOCR

---

## 🎓 How to Use These Diagrams for Thesis Defense

### 1. Convert to Images

Use Mermaid CLI or online tools:
```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i diagram.mmd -o diagram.png -w 1920 -H 1080

# Convert to SVG
mmdc -i diagram.mmd -o diagram.svg

# Convert to PDF
mmdc -i diagram.mmd -o diagram.pdf
```

### 2. Presentation Slides

**Recommended Structure:**
1. Slide 1: Complete System Architecture (Diagram 25)
2. Slide 2: Main System Workflow (Diagram 1)
3. Slide 3: AI Detection Pipeline (Diagram 2)
4. Slide 4: User Workflows (Diagrams 3-5)
5. Slide 5: Database Relationships (Diagram 19)
6. Slide 6: Security Architecture (Diagram 24)

### 3. Defense Talking Points

For each diagram, explain:
- **What:** What process does this diagram show?
- **Why:** Why is this process important for the system?
- **How:** How does it work technically?
- **Tech:** What technologies are used?
- **Benefit:** What benefit does it provide to users?

### 4. Print Materials

Print these diagrams as:
- **A4 Handouts** for defense committee
- **A3 Posters** for display during presentation
- **Thesis Appendix** for detailed documentation

---

## ✅ Diagram Completion Status

| # | Diagram Name | Status | Page in Thesis |
|---|--------------|--------|----------------|
| 1 | Main System Workflow | ✅ Complete | Ch. 4.1 |
| 2 | AI Detection Pipeline | ✅ Complete | Ch. 4.2 |
| 3 | Administrator Workflow | ✅ Complete | Ch. 5.1 |
| 4 | Police Officer Workflow | ✅ Complete | Ch. 5.2 |
| 5 | Driver Workflow | ✅ Complete | Ch. 5.3 |
| 6 | Camera Management | ✅ Complete | Ch. 4.3 |
| 7 | Violation Processing | ✅ Complete | Ch. 4.4 |
| 8 | Fine Management | ✅ Complete | Ch. 4.5 |
| 9 | Appeal Process | ✅ Complete | Ch. 4.6 |
| 10 | Notification System | ✅ Complete | Ch. 4.7 |
| 11 | OCR Process | ✅ Complete | Ch. 4.8 |
| 12 | Report Generation | ✅ Complete | Ch. 4.9 |
| 13 | Authentication Flow | ✅ Complete | Ch. 6.1 |
| 14 | Image Upload Detection | ✅ Complete | Ch. 4.10 |
| 15 | Video Upload Detection | ✅ Complete | Ch. 4.11 |
| 16 | Live Camera Detection | ✅ Complete | Ch. 4.12 |
| 17 | Webcam Detection | ✅ Complete | Ch. 4.13 |
| 18 | AI Model Training | ✅ Complete | Ch. 3.1 |
| 19 | Database Relationships | ✅ Complete | Ch. 6.2 |
| 20 | API Request Flow | ✅ Complete | Ch. 6.3 |
| 21 | Payment Processing | ✅ Complete | Ch. 4.14 |
| 22 | Vehicle Registration | ✅ Complete | Ch. 5.4 |
| 23 | System Deployment | ✅ Complete | Ch. 7.1 |
| 24 | Security Architecture | ✅ Complete | Ch. 6.4 |
| 25 | Complete Architecture | ✅ Complete | Ch. 3.2 |

**Total:** 25 professional workflow diagrams ✅

---

## 📝 Additional Recommendations

### Sequence Diagrams Needed

Consider adding these sequence diagrams:
1. User Authentication Sequence
2. Violation Creation Sequence
3. Fine Payment Sequence
4. Appeal Review Sequence
5. Camera Capture Sequence

### Data Flow Diagrams

Create these DFDs:
1. Context Diagram (Level 0)
2. Level 1 DFD (6 major processes)
3. Level 2 DFD for AI Detection
4. Level 2 DFD for Violation Management

### UI Screenshots

Prepare screenshots for:
1. All 3 dashboards (Admin, Police, Driver)
2. AI detection results
3. Violation review page
4. Fine payment page
5. Appeal submission page

---

**Document Created:** July 26, 2026  
**Total Diagrams:** 25+ professional workflows  
**Format:** Mermaid (convertible to PNG/SVG/PDF)  
**Purpose:** Thesis defense presentation  
**Status:** ✅ Complete and ready for conversion
