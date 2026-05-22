export const PASSWORD_REQUIREMENTS = [
  { key: 'len', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const STRENGTH_META = [
  { label: 'Too short', color: '#e5e7eb' },
  { label: 'Weak', color: '#ef4444' },
  { label: 'Fair', color: '#f97316' },
  { label: 'Good', color: '#eab308' },
  { label: 'Strong', color: '#22c55e' },
] as const;

export function calcPasswordStrength(pwd: string): number {
  if (!pwd) return 0;
  return PASSWORD_REQUIREMENTS.filter((r) => r.test(pwd)).length;
}

export function isStrongPassword(pwd: string): boolean {
  return calcPasswordStrength(pwd) === PASSWORD_REQUIREMENTS.length;
}

export function getPasswordValidationError(pwd: string): string | null {
  if (!pwd) return 'Password is required.';
  const missing = PASSWORD_REQUIREMENTS.filter((r) => !r.test(pwd)).map((r) => r.label);
  if (missing.length === 0) return null;
  return `Password must meet all requirements: ${missing.join(', ')}.`;
}
