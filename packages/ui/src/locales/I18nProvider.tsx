import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isLocale } from './config';
import { detectBrowserLocale } from './detectLocale';
import { en } from './en';
import { km } from './km';
import { mergeDictionary } from './mergeDictionary';
import type { DeepPartial, Dictionary, Locale } from './types';

const baseDictionaries: Record<Locale, Dictionary> = { en, km };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const DEFAULT_STORAGE_KEY = 'camtraffic-locale';

export interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
  storageKey?: string;
  detectBrowser?: boolean;
  overrides?: Partial<Record<Locale, DeepPartial<Dictionary>>>;
}

export function I18nProvider({
  children,
  defaultLocale = 'en',
  storageKey = DEFAULT_STORAGE_KEY,
  detectBrowser = true,
  overrides,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale;

    const stored = window.localStorage.getItem(storageKey);
    if (isLocale(stored)) return stored;

    return detectBrowser ? detectBrowserLocale(defaultLocale) : defaultLocale;
  });

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      window.localStorage.setItem(storageKey, next);
      document.documentElement.lang = next;
      document.documentElement.setAttribute('data-locale', next);
    },
    [storageKey],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-locale', locale);
  }, [locale]);

  const t = useMemo(
    () => mergeDictionary(baseDictionaries[locale], overrides?.[locale]),
    [locale, overrides],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
}
