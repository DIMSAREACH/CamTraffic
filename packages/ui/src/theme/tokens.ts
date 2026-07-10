export const lightTheme = {
  '--ct-color-bg': '#f8fafc',
  '--ct-color-surface': '#ffffff',
  '--ct-color-surface-raised': '#ffffff',
  '--ct-color-sidebar': '#111827',
  '--ct-color-text': '#0f172a',
  '--ct-color-text-muted': '#64748b',
  '--ct-color-primary': '#2563eb',
  '--ct-color-primary-hover': '#1d4ed8',
  '--ct-color-accent': '#06b6d4',
  '--ct-color-secondary': '#e2e8f0',
  '--ct-color-border': '#e2e8f0',
  '--ct-color-danger': '#ef4444',
  '--ct-color-warning': '#f59e0b',
  '--ct-color-success': '#22c55e',
  '--ct-color-info': '#0284c7',
  '--ct-color-focus': '#3b82f6',
  '--ct-radius': '0.5rem',
  '--ct-radius-lg': '0.75rem',
  '--ct-shadow': '0 1px 3px rgba(15, 23, 42, 0.08)',
  '--ct-shadow-lg': '0 10px 25px rgba(15, 23, 42, 0.12)',
  '--ct-space-1': '0.25rem',
  '--ct-space-2': '0.5rem',
  '--ct-space-3': '0.75rem',
  '--ct-space-4': '1rem',
  '--ct-space-5': '1.25rem',
  '--ct-space-6': '1.5rem',
  '--ct-motion-fast': '120ms',
  '--ct-motion-normal': '180ms',
  '--ct-motion-slow': '260ms',
  '--ct-font-sans-en': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--ct-font-sans-km': "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS System', sans-serif",
  '--ct-font-sans': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--ct-font-mono': "ui-monospace, Consolas, monospace",
} as const;

export const darkTheme = {
  '--ct-color-bg': '#09090b',
  '--ct-color-surface': '#0f172a',
  '--ct-color-surface-raised': '#111827',
  '--ct-color-sidebar': '#111827',
  '--ct-color-text': '#f8fafc',
  '--ct-color-text-muted': '#94a3b8',
  '--ct-color-primary': '#2563eb',
  '--ct-color-primary-hover': '#3b82f6',
  '--ct-color-accent': '#06b6d4',
  '--ct-color-secondary': '#334155',
  '--ct-color-border': '#334155',
  '--ct-color-danger': '#ef4444',
  '--ct-color-warning': '#f59e0b',
  '--ct-color-success': '#22c55e',
  '--ct-color-info': '#38bdf8',
  '--ct-color-focus': '#60a5fa',
  '--ct-radius': '0.5rem',
  '--ct-radius-lg': '0.75rem',
  '--ct-shadow': '0 1px 3px rgba(0, 0, 0, 0.35)',
  '--ct-shadow-lg': '0 12px 28px rgba(0, 0, 0, 0.45)',
  '--ct-space-1': '0.25rem',
  '--ct-space-2': '0.5rem',
  '--ct-space-3': '0.75rem',
  '--ct-space-4': '1rem',
  '--ct-space-5': '1.25rem',
  '--ct-space-6': '1.5rem',
  '--ct-motion-fast': '120ms',
  '--ct-motion-normal': '180ms',
  '--ct-motion-slow': '260ms',
  '--ct-font-sans-en': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--ct-font-sans-km': "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS System', sans-serif",
  '--ct-font-sans': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--ct-font-mono': "ui-monospace, Consolas, monospace",
} as const;

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

/** @deprecated Use ThemePreference */
export type ThemeMode = ThemePreference;

export type ThemeTokens = Record<string, string>;

export interface ThemeOverrides {
  light?: Partial<Record<keyof typeof lightTheme, string>>;
  dark?: Partial<Record<keyof typeof darkTheme, string>>;
}
