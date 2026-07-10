import type { ThemeOverrides } from '@camtraffic/ui';

export const ADMIN_THEME_STORAGE_KEY = 'camtraffic-admin-theme';

/** Enterprise palette aligned with Phase 18 design system. */
export const adminThemeOverrides: ThemeOverrides = {
  light: {
    '--ct-color-primary': '#2563eb',
    '--ct-color-primary-hover': '#1d4ed8',
    '--ct-color-accent': '#06b6d4',
    '--ct-color-bg': '#f8fafc',
    '--ct-color-surface': '#ffffff',
    '--ct-color-sidebar': '#111827',
  },
  dark: {
    '--ct-color-primary': '#2563eb',
    '--ct-color-primary-hover': '#3b82f6',
    '--ct-color-accent': '#06b6d4',
    '--ct-color-bg': '#09090b',
    '--ct-color-surface': '#0f172a',
    '--ct-color-sidebar': '#111827',
  },
};
