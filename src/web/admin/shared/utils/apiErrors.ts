const RAW_VALIDATION_RE = /ErrorDetail\(|'\w+':\s*\[|^\{.*':/;

export function looksLikeRawValidationDump(text: string): boolean {
  return RAW_VALIDATION_RE.test(text);
}

export function friendlyFieldError(field: string, message: string): string {
  const lower = message.toLowerCase();
  if (field === 'email' && lower.includes('already exists')) {
    return 'An account with this email already exists. Please sign in or use a different email.';
  }
  if (field === 'non_field_errors' || field === 'detail') return message;
  const label = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label}: ${message}`;
}

export function formatApiFieldErrors(errors: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  for (const [field, val] of Object.entries(errors)) {
    if (field === 'detail' && Object.keys(errors).length > 1) continue;
    const texts = Array.isArray(val) ? val.map(String) : [String(val)];
    for (const text of texts) {
      if (text.trim()) parts.push(friendlyFieldError(field, text));
    }
  }
  return parts.length ? parts.join(' · ') : undefined;
}

export function parseApiErrorBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;

  const errors = record.errors;
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const fromFields = formatApiFieldErrors(errors as Record<string, unknown>);
    if (fromFields) return fromFields;
  }

  if (typeof record.message === 'string' && record.message.trim()) {
    const msg = record.message.trim();
    if (looksLikeRawValidationDump(msg)) {
      if (msg.toLowerCase().includes('already exists') && msg.toLowerCase().includes('email')) {
        return friendlyFieldError('email', 'user with this email already exists.');
      }
      return undefined;
    }
    return msg;
  }

  const direct = record.detail;
  if (typeof direct === 'string' && direct.trim() && !looksLikeRawValidationDump(direct)) {
    return direct;
  }

  return undefined;
}

export function humanizeApiError(detail: string): string {
  if (/authentication credentials|not authenticated|token not valid|token is invalid|given token not valid/i.test(detail)) {
    return 'Session expired. Please log in again.';
  }
  return detail;
}
