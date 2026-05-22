import type { Locale } from './translations';

export function localeTag(locale: Locale): string {
  return locale === 'km' ? 'km-KH' : 'en-US';
}

export function formatAppDate(
  locale: Locale,
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(localeTag(locale), options);
}

export function greetingKey(hour: number): 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening' {
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  return 'greeting.evening';
}
