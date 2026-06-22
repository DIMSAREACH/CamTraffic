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

/** Reference USD → KHR rate (National Bank of Cambodia, rounded for display). */
export const USD_TO_KHR = 4100;

/** Fine amounts are stored in USD; convert for Khmer display. */
export function usdToKhr(amountUsd: number): number {
  return Math.round(amountUsd * USD_TO_KHR);
}

/** Convert Riel input back to USD for API storage. */
export function khrToUsd(amountKhr: number): number {
  return Math.round((amountKhr / USD_TO_KHR) * 100) / 100;
}

export function formatAppCurrency(locale: Locale, amountUsd: number, compact = false): string {
  const khr = usdToKhr(amountUsd);
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency: 'KHR',
    maximumFractionDigits: 0,
    ...(compact && khr >= 10_000
      ? { notation: 'compact' as const, maximumFractionDigits: 1 }
      : {}),
  }).format(khr);
}

/** Compact revenue headline (dashboard cards, reports). */
export function formatRevenue(locale: Locale, amountUsd: number): string {
  return formatAppCurrency(locale, amountUsd, true);
}

/** Shorter axis labels for revenue charts. */
export function formatChartAxisCurrency(locale: Locale, amountUsd: number): string {
  return formatAppCurrency(locale, amountUsd, true);
}
