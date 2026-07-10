# Driver Layout

> **Phase 4** · Tasks **062**

## Overview

Layout shell for drivers with sidebar navigation, header, and footer.

## Folder

`frontend-user/src/layouts/driver/`

## Structure

```text
frontend-user/src/layouts/driver/
├── DriverLayout.tsx
├── DriverHeader.tsx
├── DriverFooter.tsx
├── DriverSidebarNavigation.tsx
├── index.ts
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 062 | ✅ Completed |

## Status

- [x] Reusable driver layout shell with sidebar/content/footer slots
- [x] Authenticated driver area migrated to `DriverLayout`
- [x] Sidebar navigation with active route highlighting

## Notes

Driver portal routes live under `/driver/*`. Feature pages (Tasks 074–082) plug into the layout main content area via `portalPath` in `App.tsx`.
