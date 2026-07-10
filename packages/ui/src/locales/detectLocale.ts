import { DEFAULT_LOCALE } from './config';
import type { Locale } from './types';

export function detectBrowserLocale(fallback: Locale = DEFAULT_LOCALE): Locale {
  if (typeof navigator === 'undefined') return fallback;

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of languages) {
    const code = language.toLowerCase();
    if (code.startsWith('km')) return 'km';
    if (code.startsWith('en')) return 'en';
  }

  return fallback;
}
