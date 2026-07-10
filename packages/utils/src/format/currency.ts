import { toIntlLocale, type AppLocale } from './locale';

export function formatCurrency(
  amount: number,
  currency: 'KHR' | 'USD' = 'KHR',
  locale: AppLocale | string = 'km',
): string {
  const intlLocale = toIntlLocale(locale);
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KHR' ? 0 : 2,
  }).format(amount);
}

export function formatPlateNumber(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, ' ');
}
