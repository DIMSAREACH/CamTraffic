# @camtraffic/ui

Shared UI component library with theme and localization for CamTraffic.

## Components (Task 106)

`Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Alert`, `Spinner`

See [packages/docs/COMPONENTS.md](../docs/COMPONENTS.md) for usage examples.

## Theme (Task 111)

```tsx
import { ThemeProvider, useTheme } from '@camtraffic/ui';

<ThemeProvider defaultMode="light">
  <App />
</ThemeProvider>
```

## Localization (Task 112)

```tsx
import { I18nProvider, useTranslation } from '@camtraffic/ui';

function Toolbar() {
  const { t } = useTranslation();
  return <span>{t('management.refresh')}</span>;
}

<I18nProvider defaultLocale="km">
  <App />
</I18nProvider>
```

Dictionaries: `en` and `km` with shared keys validated by `scripts/validate-locales.mjs`.

## Styles

```ts
import '@camtraffic/ui/styles/base.css';
```

Subpath imports: `@camtraffic/ui/theme`, `@camtraffic/ui/locales`
