import type { PropsWithChildren } from 'react';
import { I18nProvider, ThemeProvider } from '@camtraffic/ui';
import { adminThemeOverrides, ADMIN_THEME_STORAGE_KEY } from '../themes';
import { adminLocaleOverrides, ADMIN_LOCALE_STORAGE_KEY } from '../locales';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider
      defaultPreference="system"
      storageKey={ADMIN_THEME_STORAGE_KEY}
      overrides={adminThemeOverrides}
    >
      <I18nProvider
        defaultLocale="en"
        storageKey={ADMIN_LOCALE_STORAGE_KEY}
        detectBrowser
        overrides={adminLocaleOverrides}
      >
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
