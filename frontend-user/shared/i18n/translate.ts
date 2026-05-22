import { translations, type Locale } from './translations';

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = getNested(translations[locale] as Record<string, unknown>, key);
  if (typeof value !== 'string') {
    value = getNested(translations.en as Record<string, unknown>, key);
  }
  if (typeof value !== 'string') return key;

  let text = value;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
