/** Merge class names (utility — mirrors frontend cn() pattern). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatPlate(plate: string): string {
  return plate.trim().toUpperCase();
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
}
