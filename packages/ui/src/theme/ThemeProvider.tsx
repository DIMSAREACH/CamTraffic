import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyTheme, resolveThemeMode } from './applyTheme';
import type { ResolvedThemeMode, ThemeOverrides, ThemePreference } from './tokens';

interface ThemeContextValue {
  preference: ThemePreference;
  mode: ResolvedThemeMode;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_STORAGE_KEY = 'camtraffic-theme';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultPreference?: ThemePreference;
  /** @deprecated Use defaultPreference */
  defaultMode?: ThemePreference;
  storageKey?: string;
  overrides?: ThemeOverrides;
}

export function ThemeProvider({
  children,
  defaultPreference,
  defaultMode = 'system',
  storageKey = DEFAULT_STORAGE_KEY,
  overrides,
}: ThemeProviderProps) {
  const initialPreference = defaultPreference ?? defaultMode;

  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return initialPreference;
    const stored = window.localStorage.getItem(storageKey) as ThemePreference | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return initialPreference;
  });

  const mode = useMemo(() => resolveThemeMode(preference), [preference]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      window.localStorage.setItem(storageKey, next);
    },
    [storageKey],
  );

  const toggleMode = useCallback(() => {
    setPreference(mode === 'light' ? 'dark' : 'light');
  }, [mode, setPreference]);

  useEffect(() => {
    applyTheme(mode, overrides);
  }, [mode, overrides]);

  useEffect(() => {
    if (preference !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(resolveThemeMode('system'), overrides);

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference, overrides]);

  const value = useMemo(
    () => ({ preference, mode, setPreference, toggleMode }),
    [preference, mode, setPreference, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
