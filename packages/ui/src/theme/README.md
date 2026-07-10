# Shared Theme

> **Phase 1** · Task **008** · **Phase 7** · Task **111**

## Overview

Shared light/dark theme system with CSS custom properties, React context, and portal overrides.

## Folder

`packages/ui/src/theme/`

## Structure

```text
packages/ui/src/theme/
├── tokens.ts          # Base light/dark design tokens
├── applyTheme.ts      # Token merge + DOM application
├── ThemeProvider.tsx  # React context (light/dark/system)
├── ThemeToggle.tsx    # Accessible theme switch control
├── bootstrap.ts       # FOUC prevention helpers
└── index.ts
```

## Usage

```tsx
import { ThemeProvider, ThemeToggle, useTheme } from '@camtraffic/ui';

<ThemeProvider defaultPreference="system" storageKey="camtraffic-admin-theme" overrides={portalOverrides}>
  <ThemeToggle />
</ThemeProvider>
```

## Status

- [x] Base tokens (colors, radius, shadows, typography)
- [x] Light / dark / system preference
- [x] localStorage persistence
- [x] Portal-specific overrides
- [x] ThemeToggle component
