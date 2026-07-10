import type { PropsWithChildren } from 'react';
import { I18nProvider, ThemeProvider } from '@camtraffic/ui';
import { userThemeOverrides, USER_THEME_STORAGE_KEY } from '../themes';
import { userLocaleOverrides, USER_LOCALE_STORAGE_KEY } from '../locales';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider
      defaultPreference="system"
      storageKey={USER_THEME_STORAGE_KEY}
      overrides={userThemeOverrides}
    >
      <I18nProvider
        defaultLocale="km"
        storageKey={USER_LOCALE_STORAGE_KEY}
        detectBrowser
        overrides={userLocaleOverrides}
      >
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
