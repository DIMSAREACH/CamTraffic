import { isLocale } from './config';
import { detectBrowserLocale } from './detectLocale';
import type { Locale } from './types';

export function createLocaleBootstrapScript(
  storageKey: string,
  defaultLocale: Locale = 'en',
  detectBrowser = true,
): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var d=${JSON.stringify(defaultLocale)};var detect=${detectBrowser ? 'true' : 'false'};var s=localStorage.getItem(k);var locale=s==="en"||s==="km"?s:(detect?((navigator.languages||[navigator.language]).some(function(l){return String(l).toLowerCase().indexOf("km")===0})?"km":d):d);document.documentElement.lang=locale;document.documentElement.setAttribute("data-locale",locale);}catch(e){}})();`;
}

export function readStoredLocale(storageKey: string, fallback: Locale): Locale {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(storageKey);
  return isLocale(stored) ? stored : fallback;
}

export function bootstrapLocale(
  storageKey: string,
  fallback: Locale,
  detectBrowser = true,
): Locale {
  const stored = window.localStorage.getItem(storageKey);
  let locale: Locale;

  if (isLocale(stored)) {
    locale = stored;
  } else {
    locale = detectBrowser ? detectBrowserLocale(fallback) : fallback;
    window.localStorage.setItem(storageKey, locale);
  }

  document.documentElement.lang = locale;
  document.documentElement.setAttribute('data-locale', locale);
  return locale;
}
