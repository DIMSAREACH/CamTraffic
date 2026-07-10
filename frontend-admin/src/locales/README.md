# Localization

> **Phase 1** · Task **009**

## Overview

Admin portal Khmer/English overrides layered on `@camtraffic/ui` shared dictionaries.

## Folder

`frontend-admin/src/locales/`

## Structure

```text
frontend-admin/src/locales/
├── index.ts    # adminLocaleOverrides + storage key
└── README.md
```

## Storage key

`camtraffic-admin-locale`

## Status

- [x] Portal-specific subtitle/badge/demo copy
- [x] Wired in main.tsx via I18nProvider overrides
- [x] LocaleToggle in App shell
