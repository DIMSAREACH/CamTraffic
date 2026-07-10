# Theme System

> **Phase 1** · Task **008**

## Overview

Admin portal theme — navy palette layered on shared `@camtraffic/ui` tokens.

## Folder

`frontend-admin/src/themes/`

## Structure

```text
frontend-admin/src/themes/
├── tokens.ts      # adminThemeOverrides + storage key
├── theme.css      # Portal-specific accent styles
└── index.ts
```

## Storage key

`camtraffic-admin-theme` (separate from user portal)

## Status

- [x] Admin palette overrides
- [x] Wired in main.tsx + index.html bootstrap
- [x] ThemeToggle in App shell
