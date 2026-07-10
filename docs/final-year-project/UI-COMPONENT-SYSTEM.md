# UI Component System Reference (Phase 18)

Date: 2026-07-11
Scope: Phase 18 Tasks 437-445

## 1. Elevation and Shadow System

Implemented 5-tier elevation system for enterprise UI hierarchy:

- `ct-elevation-0`: No shadow (inline elements)
- `ct-elevation-1`: Subtle shadow (cards, panels)
- `ct-elevation-2`: Medium shadow (dropdowns, floating panels)
- `ct-elevation-3`: Strong shadow (modals, overlays)
- `ct-elevation-4`: Maximum shadow (prominent modals)

CSS Variables:
- `--ct-shadow`: Base shadow for tier 1
- `--ct-shadow-lg`: Elevated shadow for tier 3

## 2. Spacing System

4px rhythm scale for consistent layout spacing:

- `--ct-space-1`: 0.25rem (4px)
- `--ct-space-2`: 0.5rem (8px)
- `--ct-space-3`: 0.75rem (12px)
- `--ct-space-4`: 1rem (16px)
- `--ct-space-5`: 1.25rem (20px)
- `--ct-space-6`: 1.5rem (24px)

Utility classes:
- `ct-space-y-{1-6}`: Vertical stack spacing

## 3. Icon System Guidelines

Standardized icon sizing and stroke rules:

- `ct-icon--xs`: 1rem (16px)
- `ct-icon--sm`: 1.25rem (20px)
- `ct-icon--md`: 1.5rem (24px)
- `ct-icon--lg`: 2rem (32px)
- `ct-icon--xl`: 2.5rem (40px)

All icons use `stroke-width: 2` for consistency.

## 4. Form Components

### Button
Variants: primary, secondary, danger, ghost
Sizes: sm, md, lg
Loading state support

### Input
Standard text input with label, hint, and error states
Focus outline and validation styling

### Select
Dropdown select with options array
Placeholder support

### Checkbox
Binary selection control
Label and error support

### Radio Group
Single-choice selection from options
Vertical layout default

### Date Picker
Native date input styled consistently
Calendar picker integration

### Search Bar
Icon-prefixed search input
Clear button when value present
Keyboard shortcut support (Enter to search)

## 5. Implementation Files

- `packages/ui/src/styles/base.css` - Core styles and utilities
- `packages/ui/src/components/Button.tsx`
- `packages/ui/src/components/Input.tsx`
- `packages/ui/src/components/Select.tsx`
- `packages/ui/src/components/Checkbox.tsx`
- `packages/ui/src/components/Radio.tsx`
- `packages/ui/src/components/DatePicker.tsx`
- `packages/ui/src/components/SearchBar.tsx`
- `packages/ui/src/components/index.ts`
- `packages/ui/src/index.ts`
