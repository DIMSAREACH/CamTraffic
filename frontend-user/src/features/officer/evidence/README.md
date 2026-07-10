# Evidence Viewer

> **Phase 4** · Tasks **070**

## Overview

Officer-side viewer for violation detection frames and stored evidence images.

## Folder

`frontend-user/src/features/officer/evidence/`

## Structure

```text
frontend-user/src/features/officer/evidence/
├── README.md
├── index.ts
└── OfficerEvidenceViewerPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/violations/officer/evidence/` | List station violations with evidence metadata |
| `GET` | `/api/v1/violations/officer/evidence/<id>/` | Evidence detail with detection and violation images |

## Related Tasks

| Task | Status |
|------|--------|
| Task 066–067 | ✅ Violation review workflow |
| Task 070 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- List shows detection thumbnails and violation context.
- Detail viewer toggles between detection capture and violation evidence images.
- Bounding box metadata is surfaced when available from the detection record.
- `OfficerEvidenceViewerPage` wired at `/officer/evidence`.
