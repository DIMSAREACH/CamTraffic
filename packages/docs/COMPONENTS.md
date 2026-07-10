# UI Components

> Task **106** — UI Component Library

## Overview

Shared React components used across `frontend-admin` and `frontend-user`. All components use CamTraffic theme CSS variables and the `cn()` helper from `@camtraffic/utils`.

## Components

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `Button.tsx` | Primary actions with size and variant props |
| `Input` | `Input.tsx` | Text input with label, hint, and error states |
| `Select` | `Select.tsx` | Native select with options array |
| `Textarea` | `Textarea.tsx` | Multi-line text input |
| `Card` | `Card.tsx` | Surface container with optional header |
| `Badge` | `Badge.tsx` | Status pill (`default`, `success`, `warning`, `danger`, `info`) |
| `Alert` | `Alert.tsx` | Inline feedback banner |
| `Spinner` | `Spinner.tsx` | Loading indicator |

## Usage

```tsx
import { Alert, Badge, Button, Card, Input, Select, Spinner, Textarea } from '@camtraffic/ui';
import '@camtraffic/ui/styles/base.css';

<Card title="Create user">
  <Input label="Email" name="email" type="email" />
  <Select
    label="Role"
    name="role"
    options={[{ value: 'admin', label: 'Admin' }]}
    placeholder="Choose a role"
  />
  <Textarea label="Notes" name="notes" rows={4} />
  <Badge variant="success">Active</Badge>
  <Alert title="Heads up" variant="info">Changes are saved automatically.</Alert>
  <Button variant="primary">Save</Button>
</Card>
```

## Styles

Component classes are prefixed with `ct-` and defined in `packages/ui/src/styles/base.css`. Theme tokens live in `packages/ui/src/theme/`.

## Related

- Task **111** — [Theme system](../ui/src/theme/README.md)
- Task **112** — [Localization](../ui/src/locales/README.md)
