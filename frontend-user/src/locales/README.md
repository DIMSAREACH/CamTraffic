# Localization

> **Phase 1** · Task **009**

## Overview

User portal Khmer/English overrides layered on `@camtraffic/ui` shared dictionaries.

## Folder

`frontend-user/src/locales/`

## Structure

```text
frontend-user/src/locales/
├── index.ts    # userLocaleOverrides + storage key
└── README.md
```

## Storage key

`camtraffic-user-locale`

## Status

- [x] Portal-specific subtitle/badge/demo copy
- [x] Wired in main.tsx via I18nProvider overrides
- [x] LocaleToggle in App shell
