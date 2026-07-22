import type { UserRole } from '@shared/types';

export const USER_PORTAL_BASE = '/dashboard';

/** Canonical user-portal paths (officer + driver). */
export const USER_PORTAL_ROUTES = {
  dashboard: USER_PORTAL_BASE,
  aiDetection: `${USER_PORTAL_BASE}/ai-detection`,
  cameras: `${USER_PORTAL_BASE}/cameras`,
  signs: `${USER_PORTAL_BASE}/signs`,
  fines: `${USER_PORTAL_BASE}/fines`,
  finesPayments: `${USER_PORTAL_BASE}/fines/payments`,
  violations: `${USER_PORTAL_BASE}/violations`,
  appeals: `${USER_PORTAL_BASE}/appeals`,
  vehicles: `${USER_PORTAL_BASE}/vehicles`,
  aiLogs: `${USER_PORTAL_BASE}/ai-logs`,
  evidence: `${USER_PORTAL_BASE}/evidence`,
  unknownVehicles: `${USER_PORTAL_BASE}/unknown-vehicles`,
  reports: `${USER_PORTAL_BASE}/reports`,
  notifications: `${USER_PORTAL_BASE}/notifications`,
  profile: `${USER_PORTAL_BASE}/profile`,
  settings: `${USER_PORTAL_BASE}/settings`,
} as const;

export type PortalNavSection = 'main' | 'manage' | 'account';

export interface PortalNavItem {
  labelKey: string;
  path: string;
  roles: UserRole[];
  section: PortalNavSection;
}

/** Routes blocked for drivers (enforcement outcomes only — no operational AI). */
export const DRIVER_BLOCKED_ROUTE_PREFIXES: readonly string[] = [
  USER_PORTAL_ROUTES.aiDetection,
  USER_PORTAL_ROUTES.cameras,
  USER_PORTAL_ROUTES.aiLogs,
  USER_PORTAL_ROUTES.evidence,
  USER_PORTAL_ROUTES.unknownVehicles,
  USER_PORTAL_ROUTES.reports,
  USER_PORTAL_ROUTES.signs,
];

/** Roles allowed to run AI detection (upload, webcam, pipeline). */
export const OPERATIONAL_AI_ROLES: UserRole[] = ['admin', 'police'];

export function canAccessOperationalAi(role: UserRole | undefined | null): boolean {
  return Boolean(role && OPERATIONAL_AI_ROLES.includes(role));
}

/** Full user-portal sidebar catalog (filtered per role in the sidebar). */
export const USER_PORTAL_NAV: PortalNavItem[] = [
  { labelKey: 'sidebar.nav.dashboard', path: USER_PORTAL_ROUTES.dashboard, roles: ['police', 'driver'], section: 'main' },
  { labelKey: 'sidebar.nav.aiDetection', path: USER_PORTAL_ROUTES.aiDetection, roles: ['police'], section: 'main' },
  { labelKey: 'sidebar.nav.cameras', path: USER_PORTAL_ROUTES.cameras, roles: ['police'], section: 'main' },
  { labelKey: 'sidebar.nav.trafficSigns', path: USER_PORTAL_ROUTES.signs, roles: ['police'], section: 'main' },
  { labelKey: 'sidebar.nav.fineManagement', path: USER_PORTAL_ROUTES.fines, roles: ['police', 'driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.violationManagement', path: USER_PORTAL_ROUTES.violations, roles: ['police', 'driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.appeals', path: USER_PORTAL_ROUTES.appeals, roles: ['police', 'driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.myVehicles', path: USER_PORTAL_ROUTES.vehicles, roles: ['driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.detectionLogs', path: USER_PORTAL_ROUTES.aiLogs, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.evidenceArchive', path: USER_PORTAL_ROUTES.evidence, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.unknownVehicles', path: USER_PORTAL_ROUTES.unknownVehicles, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.reports', path: USER_PORTAL_ROUTES.reports, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.settings', path: USER_PORTAL_ROUTES.settings, roles: ['driver'], section: 'account' },
  { labelKey: 'sidebar.nav.notifications', path: USER_PORTAL_ROUTES.notifications, roles: ['police', 'driver'], section: 'account' },
  { labelKey: 'sidebar.nav.myProfile', path: USER_PORTAL_ROUTES.profile, roles: ['police', 'driver'], section: 'account' },
];

export function getNavItemsForRole(role: UserRole): PortalNavItem[] {
  return USER_PORTAL_NAV.filter((item) => item.roles.includes(role));
}

export function isUserPortalRouteAllowed(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return false;
  if (role === 'driver') {
    const blocked = DRIVER_BLOCKED_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (blocked) return false;
  }
  const items = getNavItemsForRole(role);
  if (pathname === USER_PORTAL_ROUTES.finesPayments && role !== 'driver') return false;
  return items.some((item) =>
    item.path === USER_PORTAL_ROUTES.dashboard
      ? pathname === USER_PORTAL_ROUTES.dashboard
      : pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
}

export function defaultDashboardPath(_role: UserRole): string {
  return USER_PORTAL_ROUTES.dashboard;
}
