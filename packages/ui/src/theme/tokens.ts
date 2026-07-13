/** Design tokens — aligned with frontend-admin/shared/styles CSS variables. */
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  adminAccent: '#8B5CF6',
  userAccent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  surfaceDark: '#0F172A',
  surfaceLight: '#FFFFFF',
} as const;

export const fonts = {
  bodyEn: 'Inter, system-ui, sans-serif',
  bodyKm: '"Noto Sans Khmer", "Kantumruy Pro", sans-serif',
  display: 'var(--font-display, Inter, sans-serif)',
} as const;

export const motion = {
  fast: '120ms',
  normal: '180ms',
  slow: '280ms',
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';

export const themeModes: ThemeMode[] = ['light', 'dark', 'system'];
