/** Cambodia mobile: 0xx xxx xxxx or +855 xx xxx xxxx */
const PHONE_PATTERN = /^(?:\+855|0)(?:1[0-9]|6|7|8|9)\d{7,8}$/;

export function isValidKhmerPhone(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, '');
  return PHONE_PATTERN.test(normalized);
}

export function normalizeKhmerPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '');
  if (digits.startsWith('+855')) return digits;
  if (digits.startsWith('0')) return `+855${digits.slice(1)}`;
  return digits;
}
