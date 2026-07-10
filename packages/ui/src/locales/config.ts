import type { Locale } from './types';

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES: readonly {
  code: Locale;
  label: string;
  nativeLabel: string;
  dir: 'ltr';
}[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'km', label: 'Khmer', nativeLabel: 'ខ្មែរ', dir: 'ltr' },
] as const;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'km';
}
