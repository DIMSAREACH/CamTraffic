# Theme System

> **Phase 1** · Task **008**

## Overview

User portal theme — green officer/driver palette layered on shared `@camtraffic/ui` tokens.

## Folder

`frontend-user/src/themes/`

## Structure

```text
frontend-user/src/themes/
├── tokens.ts      # userThemeOverrides + storage key
├── theme.css      # Portal-specific accent styles
└── index.ts
```

## Storage key

`camtraffic-user-theme` (separate from admin portal)

## Status

- [x] User palette overrides
- [x] Wired in main.tsx + index.html bootstrap
- [x] ThemeToggle in App shell
