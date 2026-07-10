# UI Design Foundation (Phase 18)

Date: 2026-07-11
Scope: Phase 18 Tasks 426, 427, 440

## 1. Enterprise UI Governance Principles

1. Consistency first: shared tokens and reusable components across admin and user portals.
2. Accessibility by default: readable contrast, keyboard navigation, semantic states.
3. Localization-ready: English and Khmer typography and copy support.
4. Theme parity: light, dark, and system theme behavior must be consistent.
5. Production quality: dashboard-grade visual hierarchy, predictable interactions.

## 2. Design Token Baseline

Implemented core token categories:
- Color tokens: primary, accent, semantic colors, surface/background, sidebar
- Typography tokens: English and Khmer font families with locale-aware switching
- Spacing tokens: 4px rhythm scale (`--ct-space-1` to `--ct-space-6`)
- Motion tokens: fast/normal/slow transition timing
- Radius and shadow tokens: standard and elevated tiers

## 3. Approved Palette (Phase 18)

- Primary: `#2563EB`
- Secondary/Base dark surface: `#0F172A`
- Accent: `#06B6D4`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Light background: `#F8FAFC`
- Dark background: `#09090B`
- Sidebar: `#111827`

## 4. Typography Strategy

- English UI font: Inter
- Khmer UI font: Kantumruy Pro
- Locale-aware font switching via `data-locale` and CSS token mapping

## 5. Theme Strategy

- Light mode: supported
- Dark mode: supported
- System preference detection: supported
- Shared token application across `frontend-admin` and `frontend-user`

## 6. Implementation References

- `packages/ui/src/theme/tokens.ts`
- `packages/ui/src/styles/base.css`
- `packages/ui/src/locales/I18nProvider.tsx`
- `packages/ui/src/locales/bootstrap.ts`
- `frontend-admin/src/themes/tokens.ts`
- `frontend-user/src/themes/tokens.ts`
