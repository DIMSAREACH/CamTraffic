# Shared Localization

> **Phase 1** · Task **009** · **Phase 7** · Task **112**

## Overview

Shared Khmer/English i18n resources for all CamTraffic frontends.

## Folder

`packages/ui/src/locales/`

## Structure

```text
packages/ui/src/locales/
├── types.ts           # Dictionary + Locale types
├── en.ts              # English catalog
├── km.ts              # Khmer catalog
├── mergeDictionary.ts # Portal override merge
├── config.ts          # Supported locales
├── detectLocale.ts    # Browser language detection
├── bootstrap.ts       # html[lang] bootstrap helpers
├── I18nProvider.tsx   # React context
├── LocaleToggle.tsx   # Language switch control
└── index.ts
```

## Usage

```tsx
import { I18nProvider, LocaleToggle, useTranslation } from '@camtraffic/ui';

<I18nProvider storageKey="camtraffic-admin-locale" overrides={adminLocaleOverrides}>
  <LocaleToggle />
</I18nProvider>
```

## Validation

```bash
npm run build --workspace=@camtraffic/ui
npm run validate:locales
```

## Status

- [x] en/km dictionaries with shared keys
- [x] Portal override merge
- [x] Browser detection + localStorage
- [x] LocaleToggle component
- [x] Key parity validation script
