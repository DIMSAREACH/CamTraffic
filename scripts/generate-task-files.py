#!/usr/bin/env python3
"""Generate docs/tasks/Task001.md … Task150.md from the enterprise checklist."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "tasks"

TASKS: list[tuple[int, str, str]] = [
    (1, "Project Foundation", "Enterprise Project Setup"),
    (1, "Project Foundation", "Monorepo Folder Structure"),
    (1, "Project Foundation", "Docker & Docker Compose Setup"),
    (1, "Project Foundation", "Backend (Django + DRF) Setup"),
    (1, "Project Foundation", "Frontend Admin (React + Vite) Setup"),
    (1, "Project Foundation", "Frontend User (React + Vite) Setup"),
    (1, "Project Foundation", "AI Service (Python + YOLOv11) Setup"),
    (1, "Project Foundation", "Flutter Mobile Setup"),
    (1, "Project Foundation", "CI/CD & Git Workflow"),
    (1, "Project Foundation", "Environment Configuration"),
    (2, "Database Design", "Database Design"),
    (2, "Database Design", "User & Role Tables"),
    (2, "Database Design", "Officer & Driver Tables"),
    (2, "Database Design", "Vehicle Tables"),
    (2, "Database Design", "Traffic Sign Tables"),
    (2, "Database Design", "Camera Tables"),
    (2, "Database Design", "AI Model & Dataset Tables"),
    (2, "Database Design", "Violation, Evidence & Fine Tables"),
    (2, "Database Design", "Notification & Audit Tables"),
    (2, "Database Design", "Seed Data & Migrations"),
    (3, "Authentication", "JWT Authentication"),
    (3, "Authentication", "Login"),
    (3, "Authentication", "Logout"),
    (3, "Authentication", "Forgot Password"),
    (3, "Authentication", "Reset Password"),
    (3, "Authentication", "RBAC"),
    (3, "Authentication", "Permission Guard"),
    (3, "Authentication", "Session Management"),
    (3, "Authentication", "Profile"),
    (3, "Authentication", "Security Middleware"),
    (4, "Admin CRUD Modules", "User Management (CRUD)"),
    (4, "Admin CRUD Modules", "Role Management (CRUD)"),
    (4, "Admin CRUD Modules", "Permission Management (CRUD)"),
    (4, "Admin CRUD Modules", "Officer Management (CRUD)"),
    (4, "Admin CRUD Modules", "Driver Management (CRUD)"),
    (4, "Admin CRUD Modules", "Vehicle Management (CRUD)"),
    (4, "Admin CRUD Modules", "Vehicle Owner Management (CRUD)"),
    (4, "Admin CRUD Modules", "Traffic Sign Management (CRUD)"),
    (4, "Admin CRUD Modules", "Traffic Sign Category (CRUD)"),
    (4, "Admin CRUD Modules", "Camera Management (CRUD)"),
    (4, "Admin CRUD Modules", "Camera Location (CRUD)"),
    (4, "Admin CRUD Modules", "AI Model Management (CRUD)"),
    (4, "Admin CRUD Modules", "Dataset Management (CRUD)"),
    (4, "Admin CRUD Modules", "Violation Management (CRUD)"),
    (4, "Admin CRUD Modules", "Evidence Management (CRUD)"),
    (4, "Admin CRUD Modules", "Fine Management (CRUD)"),
    (4, "Admin CRUD Modules", "Appeal Management (CRUD)"),
    (4, "Admin CRUD Modules", "Notification Management (CRUD)"),
    (4, "Admin CRUD Modules", "Report Templates"),
    (4, "Admin CRUD Modules", "Dashboard Widgets"),
    (4, "Admin CRUD Modules", "Audit Logs"),
    (4, "Admin CRUD Modules", "System Settings"),
    (4, "Admin CRUD Modules", "Language Management"),
    (4, "Admin CRUD Modules", "Theme Management"),
    (4, "Admin CRUD Modules", "Profile Management"),
    (5, "AI Module", "AI Dashboard"),
    (5, "AI Module", "Dataset Upload"),
    (5, "AI Module", "Dataset Versioning"),
    (5, "AI Module", "Image Annotation Integration"),
    (5, "AI Module", "AI Training Center"),
    (5, "AI Module", "Traffic Sign Model Training"),
    (5, "AI Module", "Vehicle Model Training"),
    (5, "AI Module", "License Plate Model Training"),
    (5, "AI Module", "OCR Model Training"),
    (5, "AI Module", "AI Model Evaluation"),
    (5, "AI Module", "Model Deployment"),
    (5, "AI Module", "AI Analytics"),
    (5, "AI Module", "Training History"),
    (5, "AI Module", "Model Version Control"),
    (5, "AI Module", "AI Settings"),
    (6, "AI Detection Center", "AI Detection Center UI"),
    (6, "AI Detection Center", "Vehicle Detection"),
    (6, "AI Detection Center", "Traffic Sign Detection"),
    (6, "AI Detection Center", "License Plate Detection"),
    (6, "AI Detection Center", "OCR Recognition"),
    (6, "AI Detection Center", "Violation Rule Engine"),
    (6, "AI Detection Center", "Detection History"),
    (6, "AI Detection Center", "Detection API Integration"),
    (6, "AI Detection Center", "Live Camera Detection"),
    (6, "AI Detection Center", "Detection Analytics"),
    (7, "Officer Portal", "Officer Dashboard"),
    (7, "Officer Portal", "Live Camera Monitoring"),
    (7, "Officer Portal", "AI Detection Review"),
    (7, "Officer Portal", "Approve / Reject Violations"),
    (7, "Officer Portal", "Evidence Viewer"),
    (7, "Officer Portal", "Fine Issuing"),
    (7, "Officer Portal", "Reports"),
    (7, "Officer Portal", "Notifications"),
    (7, "Officer Portal", "Officer Profile"),
    (7, "Officer Portal", "Activity History"),
    (8, "Driver Portal", "Driver Dashboard"),
    (8, "Driver Portal", "Profile Management"),
    (8, "Driver Portal", "My Vehicles"),
    (8, "Driver Portal", "My Violations"),
    (8, "Driver Portal", "Evidence Viewer"),
    (8, "Driver Portal", "Fine Payment"),
    (8, "Driver Portal", "Appeal Submission"),
    (8, "Driver Portal", "Notifications"),
    (8, "Driver Portal", "Settings"),
    (8, "Driver Portal", "Payment History"),
    (9, "Mobile App", "Flutter Project"),
    (9, "Mobile App", "Authentication"),
    (9, "Mobile App", "Officer Mobile"),
    (9, "Mobile App", "Driver Mobile"),
    (9, "Mobile App", "AI Detection Viewer"),
    (9, "Mobile App", "Notifications"),
    (9, "Mobile App", "Offline Support"),
    (9, "Mobile App", "Camera Integration"),
    (9, "Mobile App", "Settings"),
    (9, "Mobile App", "Build Release"),
    (10, "Reports & Analytics", "Dashboard Charts"),
    (10, "Reports & Analytics", "Traffic Statistics"),
    (10, "Reports & Analytics", "AI Accuracy Dashboard"),
    (10, "Reports & Analytics", "Export PDF"),
    (10, "Reports & Analytics", "Export Excel"),
    (10, "Reports & Analytics", "Export CSV"),
    (10, "Reports & Analytics", "Heat Maps"),
    (10, "Reports & Analytics", "Camera Analytics"),
    (10, "Reports & Analytics", "Officer Performance"),
    (10, "Reports & Analytics", "Driver Statistics"),
    (11, "Enterprise UI/UX", "Design System"),
    (11, "Enterprise UI/UX", "Professional Login"),
    (11, "Enterprise UI/UX", "Dashboard Redesign"),
    (11, "Enterprise UI/UX", "Reusable Components"),
    (11, "Enterprise UI/UX", "Dark Mode"),
    (11, "Enterprise UI/UX", "Light Mode"),
    (11, "Enterprise UI/UX", "Khmer Localization"),
    (11, "Enterprise UI/UX", "English Localization"),
    (11, "Enterprise UI/UX", "Responsive Design"),
    (11, "Enterprise UI/UX", "Accessibility"),
    (12, "Testing", "Backend Unit Tests"),
    (12, "Testing", "Frontend Unit Tests"),
    (12, "Testing", "API Testing"),
    (12, "Testing", "AI Testing"),
    (12, "Testing", "Integration Testing"),
    (12, "Testing", "End-to-End Testing"),
    (12, "Testing", "Security Testing"),
    (12, "Testing", "Performance Testing"),
    (12, "Testing", "User Acceptance Testing"),
    (12, "Testing", "Bug Fixing"),
    (13, "Deployment", "Docker Production"),
    (13, "Deployment", "Nginx Configuration"),
    (13, "Deployment", "HTTPS & SSL"),
    (13, "Deployment", "CI/CD Pipeline"),
    (13, "Deployment", "Monitoring & Logging"),
    (13, "Deployment", "Backup & Recovery"),
    (13, "Deployment", "Production Build"),
    (13, "Deployment", "Deployment Validation"),
    (13, "Deployment", "Documentation"),
    (13, "Deployment", "Final System Demo"),
]

DONE = {
    1, 2, 3, 4, 5, 6, 7, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 38, 39, 40, 42, 44, 45, 46, 47, 48, 50, 51, 52, 55,
    61, 62, 63, 65, 66, 68, 69,
    71, 72, 73, 74, 75, 76, 77, 78, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
    91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
    111, 112, 113, 114, 115, 116, 118,
    121, 122, 123, 124, 125, 126, 127, 128, 129,
    131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
    141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
}


def status_for(task_id: int) -> str:
    if task_id in DONE:
        return "✅ Complete"
    if 101 <= task_id <= 110:
        return "⬜ Not Started"
    return "🔄 In Progress / Partial"


def render(task_id: int, phase_num: int, phase_name: str, title: str) -> str:
    num = f"{task_id:03d}"
    status = status_for(task_id)
    return f"""# Task{num} — {title}

| Field | Value |
|-------|-------|
| **Phase** | Phase {phase_num} — {phase_name} |
| **Status** | {status} |
| **Checklist** | [`docs/CHECKLIST.md`](../CHECKLIST.md) |

---

## Objective

Implement **{title}** for CamTraffic (AI-based traffic sign detection and traffic law enforcement in Cambodia).

> Fill in detailed requirements before starting. Expand sections from [`TASK-TEMPLATE.md`](TASK-TEMPLATE.md).

---

## Business Requirements

- [ ] TBD

---

## Functional Requirements

- [ ] TBD

---

## Technical Requirements

- [ ] TBD

---

## Database Changes

| Table / Model | Change |
|---------------|--------|
| TBD | |

---

## Backend Work

- [ ] TBD

---

## Frontend Work

- [ ] TBD

---

## UI/UX Requirements

- [ ] TBD

---

## API Requirements

| Method | Endpoint | Description |
|--------|----------|-------------|
| TBD | | |

---

## Acceptance Criteria

- [ ] TBD

---

## Testing Checklist

- [ ] Unit tests
- [ ] API tests
- [ ] Manual UI verification

---

## Cursor AI Prompt

```text
Context: CamTraffic — AI traffic sign detection & enforcement (Cambodia).
Task: Task{num} — {title}
Phase: Phase {phase_num} — {phase_name}

Read docs/tasks/Task{num}.md and docs/CHECKLIST.md.
Implement only this task. Match existing conventions in backend/, frontend-admin/, frontend-user/, ai/.
When done, update docs/CHECKLIST.md checkbox for Task{num} and list files changed.
```

---

## Notes / Implementation Log

| Date | Note |
|------|------|
| | |
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (phase_num, phase_name, title) in enumerate(TASKS, start=1):
        path = OUT / f"Task{i:03d}.md"
        path.write_text(render(i, phase_num, phase_name, title), encoding="utf-8")
    print(f"Wrote {len(TASKS)} files to {OUT}")


if __name__ == "__main__":
    main()
