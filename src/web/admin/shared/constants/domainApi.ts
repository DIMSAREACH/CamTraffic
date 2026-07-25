/**
 * Multi-domain API path helpers.
 * Matches thesis namespaces: /api/{admin|officer|citizen}/…
 * (also available under /api/v1/… when clients use that base).
 */

export type ApiDomain = 'admin' | 'officer' | 'citizen';

/** Infer domain from the current SPA route (user portal). */
export function apiDomainFromPath(pathname?: string): ApiDomain | null {
  const p = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/officer')) return 'officer';
  if (p.startsWith('/citizen')) return 'citizen';
  return null;
}

/** Build a domain-scoped path, with flat-resource fallback for shared/legacy callers. */
export function domainApiPath(
  resource: string,
  domain?: ApiDomain | null,
  legacyFallback?: string,
): string {
  const clean = resource.replace(/^\/+/, '');
  const d = domain === undefined ? apiDomainFromPath() : domain;
  if (d) return `/${d}/${clean}`;
  if (legacyFallback != null) return legacyFallback.startsWith('/') ? legacyFallback : `/${legacyFallback}`;
  return `/${clean}`;
}

export const ADMIN_API = {
  dashboard: '/admin/dashboard/',
  users: '/admin/users/',
  rbac: '/admin/rbac/',
  cameras: '/admin/cameras/',
  audit: '/admin/audit/',
  reports: '/admin/reports/',
  settings: '/admin/settings/',
  aiModels: '/admin/ai-models/',
} as const;

export const OFFICER_API = {
  root: '/officer/',
  dashboard: '/officer/dashboard/',
  detectionQueue: '/officer/detection-queue/',
  violations: '/officer/violations/',
  evidence: '/officer/evidence/',
  fines: '/officer/fines/',
  finesIssue: '/officer/fines/issue/',
  finesLookup: '/officer/fines/lookup/',
  liveCameras: '/officer/live-cameras/',
  cameras: '/officer/cameras/',
  reports: '/officer/reports/',
  assignedCases: '/officer/assigned-cases/',
} as const;

export const CITIZEN_API = {
  root: '/citizen/',
  dashboard: '/citizen/dashboard/',
  profile: '/citizen/profile/',
  vehicles: '/citizen/vehicles/',
  violations: '/citizen/violations/',
  fines: '/citizen/fines/',
  paymentConfig: '/citizen/fines/payment-config/',
  appeals: '/citizen/appeals/',
  notifications: '/citizen/notifications/',
} as const;
