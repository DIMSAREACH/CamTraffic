# CamTraffic — Enterprise Task Files (Task001–Task150)

One markdown file per development task for use with **Cursor AI** or **GitHub Copilot**.  
Master checklist: [`docs/CHECKLIST.md`](../CHECKLIST.md)

## Workflow

1. Pick the next unchecked task in `CHECKLIST.md`
2. Open or create `docs/tasks/TaskXXX.md` (copy from [`TASK-TEMPLATE.md`](TASK-TEMPLATE.md))
3. Fill in requirements **before** coding
4. Paste the **Cursor AI Prompt** section into chat
5. When done: mark `[x]` in `CHECKLIST.md` and log changes in the task file

## Generate all task stubs

```bash
python scripts/generate-task-files.py
```

Creates `Task001.md` … `Task150.md` with title, phase, status, and prompt scaffold.

---

## Phase 1 — Project Foundation

| Task | Title | File |
|------|-------|------|
| Task001 | Enterprise Project Setup | [Task001.md](Task001.md) |
| Task002 | Monorepo Folder Structure | [Task002.md](Task002.md) |
| Task003 | Docker & Docker Compose Setup | [Task003.md](Task003.md) |
| Task004 | Backend (Django + DRF) Setup | [Task004.md](Task004.md) |
| Task005 | Frontend Admin (React + Vite) Setup | [Task005.md](Task005.md) |
| Task006 | Frontend User (React + Vite) Setup | [Task006.md](Task006.md) |
| Task007 | AI Service (Python + YOLOv11) Setup | [Task007.md](Task007.md) |
| Task008 | Flutter Mobile Setup | [Task008.md](Task008.md) |
| Task009 | CI/CD & Git Workflow | [Task009.md](Task009.md) |
| Task010 | Environment Configuration | [Task010.md](Task010.md) |

## Phase 2 — Database Design

| Task | Title | File |
|------|-------|------|
| Task011 | Database Design | [Task011.md](Task011.md) |
| Task012 | User & Role Tables | [Task012.md](Task012.md) |
| Task013 | Officer & Driver Tables | [Task013.md](Task013.md) |
| Task014 | Vehicle Tables | [Task014.md](Task014.md) |
| Task015 | Traffic Sign Tables | [Task015.md](Task015.md) |
| Task016 | Camera Tables | [Task016.md](Task016.md) |
| Task017 | AI Model & Dataset Tables | [Task017.md](Task017.md) |
| Task018 | Violation, Evidence & Fine Tables | [Task018.md](Task018.md) |
| Task019 | Notification & Audit Tables | [Task019.md](Task019.md) |
| Task020 | Seed Data & Migrations | [Task020.md](Task020.md) |

## Phase 3 — Authentication

| Task | Title | File |
|------|-------|------|
| Task021 | JWT Authentication | [Task021.md](Task021.md) |
| Task022 | Login | [Task022.md](Task022.md) |
| Task023 | Logout | [Task023.md](Task023.md) |
| Task024 | Forgot Password | [Task024.md](Task024.md) |
| Task025 | Reset Password | [Task025.md](Task025.md) |
| Task026 | RBAC | [Task026.md](Task026.md) |
| Task027 | Permission Guard | [Task027.md](Task027.md) |
| Task028 | Session Management | [Task028.md](Task028.md) |
| Task029 | Profile | [Task029.md](Task029.md) |
| Task030 | Security Middleware | [Task030.md](Task030.md) |

## Phase 4 — Admin CRUD Modules

| Task | Title | File |
|------|-------|------|
| Task031 | User Management (CRUD) | [Task031.md](Task031.md) |
| Task032 | Role Management (CRUD) | [Task032.md](Task032.md) |
| Task033 | Permission Management (CRUD) | [Task033.md](Task033.md) |
| Task034 | Officer Management (CRUD) | [Task034.md](Task034.md) |
| Task035 | Driver Management (CRUD) | [Task035.md](Task035.md) |
| Task036 | Vehicle Management (CRUD) | [Task036.md](Task036.md) |
| Task037 | Vehicle Owner Management (CRUD) | [Task037.md](Task037.md) |
| Task038 | Traffic Sign Management (CRUD) | [Task038.md](Task038.md) |
| Task039 | Traffic Sign Category (CRUD) | [Task039.md](Task039.md) |
| Task040 | Camera Management (CRUD) | [Task040.md](Task040.md) |
| Task041 | Camera Location (CRUD) | [Task041.md](Task041.md) |
| Task042 | AI Model Management (CRUD) | [Task042.md](Task042.md) |
| Task043 | Dataset Management (CRUD) | [Task043.md](Task043.md) |
| Task044 | Violation Management (CRUD) | [Task044.md](Task044.md) |
| Task045 | Evidence Management (CRUD) | [Task045.md](Task045.md) |
| Task046 | Fine Management (CRUD) | [Task046.md](Task046.md) |
| Task047 | Appeal Management (CRUD) | [Task047.md](Task047.md) |
| Task048 | Notification Management (CRUD) | [Task048.md](Task048.md) |
| Task049 | Report Templates | [Task049.md](Task049.md) |
| Task050 | Dashboard Widgets | [Task050.md](Task050.md) |
| Task051 | Audit Logs | [Task051.md](Task051.md) |
| Task052 | System Settings | [Task052.md](Task052.md) |
| Task053 | Language Management | [Task053.md](Task053.md) |
| Task054 | Theme Management | [Task054.md](Task054.md) |
| Task055 | Profile Management | [Task055.md](Task055.md) |

## Phase 5 — AI Module

| Task | Title | File |
|------|-------|------|
| Task056 | AI Dashboard | [Task056.md](Task056.md) |
| Task057 | Dataset Upload | [Task057.md](Task057.md) |
| Task058 | Dataset Versioning | [Task058.md](Task058.md) |
| Task059 | Image Annotation Integration | [Task059.md](Task059.md) |
| Task060 | AI Training Center | [Task060.md](Task060.md) |
| Task061 | Traffic Sign Model Training | [Task061.md](Task061.md) |
| Task062 | Vehicle Model Training | [Task062.md](Task062.md) |
| Task063 | License Plate Model Training | [Task063.md](Task063.md) |
| Task064 | OCR Model Training | [Task064.md](Task064.md) |
| Task065 | AI Model Evaluation | [Task065.md](Task065.md) |
| Task066 | Model Deployment | [Task066.md](Task066.md) |
| Task067 | AI Analytics | [Task067.md](Task067.md) |
| Task068 | Training History | [Task068.md](Task068.md) |
| Task069 | Model Version Control | [Task069.md](Task069.md) |
| Task070 | AI Settings | [Task070.md](Task070.md) |

## Phase 6 — AI Detection Center

| Task | Title | File |
|------|-------|------|
| Task071 | AI Detection Center UI | [Task071.md](Task071.md) |
| Task072 | Vehicle Detection | [Task072.md](Task072.md) |
| Task073 | Traffic Sign Detection | [Task073.md](Task073.md) |
| Task074 | License Plate Detection | [Task074.md](Task074.md) |
| Task075 | OCR Recognition | [Task075.md](Task075.md) |
| Task076 | Violation Rule Engine | [Task076.md](Task076.md) |
| Task077 | Detection History | [Task077.md](Task077.md) |
| Task078 | Detection API Integration | [Task078.md](Task078.md) |
| Task079 | Live Camera Detection | [Task079.md](Task079.md) |
| Task080 | Detection Analytics | [Task080.md](Task080.md) |

## Phase 7 — Officer Portal

| Task | Title | File |
|------|-------|------|
| Task081 | Officer Dashboard | [Task081.md](Task081.md) |
| Task082 | Live Camera Monitoring | [Task082.md](Task082.md) |
| Task083 | AI Detection Review | [Task083.md](Task083.md) |
| Task084 | Approve / Reject Violations | [Task084.md](Task084.md) |
| Task085 | Evidence Viewer | [Task085.md](Task085.md) |
| Task086 | Fine Issuing | [Task086.md](Task086.md) |
| Task087 | Reports | [Task087.md](Task087.md) |
| Task088 | Notifications | [Task088.md](Task088.md) |
| Task089 | Officer Profile | [Task089.md](Task089.md) |
| Task090 | Activity History | [Task090.md](Task090.md) |

## Phase 8 — Driver Portal

| Task | Title | File |
|------|-------|------|
| Task091 | Driver Dashboard | [Task091.md](Task091.md) |
| Task092 | Profile Management | [Task092.md](Task092.md) |
| Task093 | My Vehicles | [Task093.md](Task093.md) |
| Task094 | My Violations | [Task094.md](Task094.md) |
| Task095 | Evidence Viewer | [Task095.md](Task095.md) |
| Task096 | Fine Payment | [Task096.md](Task096.md) |
| Task097 | Appeal Submission | [Task097.md](Task097.md) |
| Task098 | Notifications | [Task098.md](Task098.md) |
| Task099 | Settings | [Task099.md](Task099.md) |
| Task100 | Payment History | [Task100.md](Task100.md) |

## Phase 9 — Mobile App

| Task | Title | File |
|------|-------|------|
| Task101 | Flutter Project | [Task101.md](Task101.md) |
| Task102 | Authentication | [Task102.md](Task102.md) |
| Task103 | Officer Mobile | [Task103.md](Task103.md) |
| Task104 | Driver Mobile | [Task104.md](Task104.md) |
| Task105 | AI Detection Viewer | [Task105.md](Task105.md) |
| Task106 | Notifications | [Task106.md](Task106.md) |
| Task107 | Offline Support | [Task107.md](Task107.md) |
| Task108 | Camera Integration | [Task108.md](Task108.md) |
| Task109 | Settings | [Task109.md](Task109.md) |
| Task110 | Build Release | [Task110.md](Task110.md) |

## Phase 10 — Reports & Analytics

| Task | Title | File |
|------|-------|------|
| Task111 | Dashboard Charts | [Task111.md](Task111.md) |
| Task112 | Traffic Statistics | [Task112.md](Task112.md) |
| Task113 | AI Accuracy Dashboard | [Task113.md](Task113.md) |
| Task114 | Export PDF | [Task114.md](Task114.md) |
| Task115 | Export Excel | [Task115.md](Task115.md) |
| Task116 | Export CSV | [Task116.md](Task116.md) |
| Task117 | Heat Maps | [Task117.md](Task117.md) |
| Task118 | Camera Analytics | [Task118.md](Task118.md) |
| Task119 | Officer Performance | [Task119.md](Task119.md) |
| Task120 | Driver Statistics | [Task120.md](Task120.md) |

## Phase 11 — Enterprise UI/UX

| Task | Title | File |
|------|-------|------|
| Task121 | Design System | [Task121.md](Task121.md) |
| Task122 | Professional Login | [Task122.md](Task122.md) |
| Task123 | Dashboard Redesign | [Task123.md](Task123.md) |
| Task124 | Reusable Components | [Task124.md](Task124.md) |
| Task125 | Dark Mode | [Task125.md](Task125.md) |
| Task126 | Light Mode | [Task126.md](Task126.md) |
| Task127 | Khmer Localization | [Task127.md](Task127.md) |
| Task128 | English Localization | [Task128.md](Task128.md) |
| Task129 | Responsive Design | [Task129.md](Task129.md) |
| Task130 | Accessibility | [Task130.md](Task130.md) |

## Phase 12 — Testing

| Task | Title | File |
|------|-------|------|
| Task131 | Backend Unit Tests | [Task131.md](Task131.md) |
| Task132 | Frontend Unit Tests | [Task132.md](Task132.md) |
| Task133 | API Testing | [Task133.md](Task133.md) |
| Task134 | AI Testing | [Task134.md](Task134.md) |
| Task135 | Integration Testing | [Task135.md](Task135.md) |
| Task136 | End-to-End Testing | [Task136.md](Task136.md) |
| Task137 | Security Testing | [Task137.md](Task137.md) |
| Task138 | Performance Testing | [Task138.md](Task138.md) |
| Task139 | User Acceptance Testing | [Task139.md](Task139.md) |
| Task140 | Bug Fixing | [Task140.md](Task140.md) |

## Phase 13 — Deployment

| Task | Title | File |
|------|-------|------|
| Task141 | Docker Production | [Task141.md](Task141.md) |
| Task142 | Nginx Configuration | [Task142.md](Task142.md) |
| Task143 | HTTPS & SSL | [Task143.md](Task143.md) |
| Task144 | CI/CD Pipeline | [Task144.md](Task144.md) |
| Task145 | Monitoring & Logging | [Task145.md](Task145.md) |
| Task146 | Backup & Recovery | [Task146.md](Task146.md) |
| Task147 | Production Build | [Task147.md](Task147.md) |
| Task148 | Deployment Validation | [Task148.md](Task148.md) |
| Task149 | Documentation | [Task149.md](Task149.md) |
| Task150 | Final System Demo | [Task150.md](Task150.md) |
