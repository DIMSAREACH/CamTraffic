/**
 * Multi-domain portal path constants.
 *
 * Administration  → frontend-admin (/admin/*)
 * Traffic Ops     → /officer/*
 * Citizen Service → /citizen/*
 *
 * Legacy /dashboard/* is remapped to the role domain.
 */

export const OFFICER_PORTAL_BASE = '/officer';
export const CITIZEN_PORTAL_BASE = '/citizen';
/** @deprecated Prefer OFFICER_PORTAL_BASE or CITIZEN_PORTAL_BASE */
export const USER_PORTAL_BASE = OFFICER_PORTAL_BASE;
export const LEGACY_DASHBOARD_BASE = '/dashboard';

export type OperationalPortalRole = 'police' | 'driver';

function buildPortalRoutes(base: string) {
  return {
    dashboard: base,
    aiDetection: `${base}/ai-detection`,
    aiDetectionNew: `${base}/ai-detection/new`,
    aiDetectionSource: `${base}/ai-detection/source`,
    cameras: `${base}/cameras`,
    signs: `${base}/signs`,
    fines: `${base}/fines`,
    finesPayments: `${base}/fines/payments`,
    violations: `${base}/violations`,
    detectionQueue: `${base}/detection-queue`,
    appeals: `${base}/appeals`,
    vehicles: `${base}/vehicles`,
    aiLogs: `${base}/ai-logs`,
    evidence: `${base}/evidence`,
    unknownVehicles: `${base}/unknown-vehicles`,
    driverSearch: `${base}/driver-search`,
    reports: `${base}/reports`,
    reportsCenter: `${base}/reports/center`,
    reportsAnalytics: `${base}/reports/analytics`,
    reportsScheduled: `${base}/reports/scheduled`,
    notifications: `${base}/notifications`,
    profile: `${base}/profile`,
    settings: `${base}/settings`,
    trafficRules: `${base}/traffic-rules`,
    support: `${base}/support`,
    auditLogs: `${base}/audit-logs`,
  } as const;
}

export type PortalRoutes = ReturnType<typeof buildPortalRoutes>;

/** Traffic Operations domain (officer / police). */
export const OFFICER_PORTAL_ROUTES = buildPortalRoutes(OFFICER_PORTAL_BASE);

/** Citizen Service domain (driver). */
export const CITIZEN_PORTAL_ROUTES = buildPortalRoutes(CITIZEN_PORTAL_BASE);

/**
 * @deprecated Prefer OFFICER_PORTAL_ROUTES or CITIZEN_PORTAL_ROUTES.
 * Kept as officer routes for older officer-centric imports.
 */
export const USER_PORTAL_ROUTES = OFFICER_PORTAL_ROUTES;

export function getPortalBaseForRole(role: OperationalPortalRole): string {
  return role === 'police' ? OFFICER_PORTAL_BASE : CITIZEN_PORTAL_BASE;
}

export function getPortalRoutesForRole(role: OperationalPortalRole): PortalRoutes {
  return role === 'police' ? OFFICER_PORTAL_ROUTES : CITIZEN_PORTAL_ROUTES;
}

export function homePathForRole(role: string | undefined | null): string {
  if (role === 'police') return OFFICER_PORTAL_BASE;
  if (role === 'driver') return CITIZEN_PORTAL_BASE;
  if (role === 'admin') return '/admin/dashboard';
  return '/';
}

/** Detect portal base from the current pathname. */
export function portalBaseFromPath(pathname: string): string {
  if (pathname === OFFICER_PORTAL_BASE || pathname.startsWith(`${OFFICER_PORTAL_BASE}/`)) {
    return OFFICER_PORTAL_BASE;
  }
  if (pathname === CITIZEN_PORTAL_BASE || pathname.startsWith(`${CITIZEN_PORTAL_BASE}/`)) {
    return CITIZEN_PORTAL_BASE;
  }
  if (pathname === LEGACY_DASHBOARD_BASE || pathname.startsWith(`${LEGACY_DASHBOARD_BASE}/`)) {
    return LEGACY_DASHBOARD_BASE;
  }
  return OFFICER_PORTAL_BASE;
}

/** Map /dashboard/... → /officer/... or /citizen/... */
export function remapLegacyDashboardPath(
  pathname: string,
  role: OperationalPortalRole,
): string {
  if (pathname !== LEGACY_DASHBOARD_BASE && !pathname.startsWith(`${LEGACY_DASHBOARD_BASE}/`)) {
    return pathname;
  }
  const rest = pathname.slice(LEGACY_DASHBOARD_BASE.length);
  return `${getPortalBaseForRole(role)}${rest}`;
}

export function isOfficerPortalPath(pathname: string): boolean {
  return pathname === OFFICER_PORTAL_BASE || pathname.startsWith(`${OFFICER_PORTAL_BASE}/`);
}

export function isCitizenPortalPath(pathname: string): boolean {
  return pathname === CITIZEN_PORTAL_BASE || pathname.startsWith(`${CITIZEN_PORTAL_BASE}/`);
}

export function isUserPortalPath(pathname: string): boolean {
  return (
    isOfficerPortalPath(pathname)
    || isCitizenPortalPath(pathname)
    || pathname === LEGACY_DASHBOARD_BASE
    || pathname.startsWith(`${LEGACY_DASHBOARD_BASE}/`)
  );
}
