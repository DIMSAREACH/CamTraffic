/** Login identifier shown in navbar (email local-part; USERNAME_FIELD is email). */
export function getDisplayUsername(email?: string | null): string {
  if (!email) return '';
  const local = email.split('@')[0]?.trim();
  return local || email;
}
