export { en } from './en';
export { km } from './km';
export { mergeDictionary } from './mergeDictionary';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale } from './config';
export { detectBrowserLocale } from './detectLocale';
export {
  bootstrapLocale,
  createLocaleBootstrapScript,
  readStoredLocale,
} from './bootstrap';
export { I18nProvider, useI18n, useTranslation } from './I18nProvider';
export type { I18nProviderProps } from './I18nProvider';
export { LocaleToggle } from './LocaleToggle';
export type { LocaleToggleProps } from './LocaleToggle';
export type { Dictionary, DeepPartial, Locale, EnDictionary } from './types';
