export type AppLocale = 'en' | 'km';

const INTL_LOCALE_MAP: Record<AppLocale, string> = {
  en: 'en-KH',
  km: 'km-KH',
};

export function toIntlLocale(locale: AppLocale | string = 'en'): string {
  if (locale === 'en' || locale === 'km') {
    return INTL_LOCALE_MAP[locale];
  }
  return locale;
}

export function isAppLocale(value: string): value is AppLocale {
  return value === 'en' || value === 'km';
}
