import {
  darkTheme,
  lightTheme,
  type ResolvedThemeMode,
  type ThemeOverrides,
  type ThemeTokens,
} from './tokens';

export function mergeThemeTokens(
  base: ThemeTokens,
  overrides?: Partial<ThemeTokens>,
): ThemeTokens {
  if (!overrides) return { ...base };

  const merged: ThemeTokens = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function resolveThemeMode(
  preference: 'light' | 'dark' | 'system',
): ResolvedThemeMode {
  if (preference === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

export function getThemeTokens(
  mode: ResolvedThemeMode,
  overrides?: ThemeOverrides,
): ThemeTokens {
  const base = mode === 'dark' ? darkTheme : lightTheme;
  const modeOverrides = mode === 'dark' ? overrides?.dark : overrides?.light;
  return mergeThemeTokens(base, modeOverrides);
}

export function applyTheme(
  mode: ResolvedThemeMode,
  overrides?: ThemeOverrides,
): void {
  const root = document.documentElement;
  const tokens = getThemeTokens(mode, overrides);

  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}
