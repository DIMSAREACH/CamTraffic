import type { UserRole } from '@shared/types';
import {
  CITIZEN_PORTAL_ROUTES,
  OFFICER_PORTAL_ROUTES,
  getPortalRoutesForRole,
  homePathForRole,
  type OperationalPortalRole,
} from '@shared/constants/userPortalPaths';
import {
  getEnterpriseModulesForRole,
  type EnterpriseModule,
} from '@shared/constants/enterpriseModules';

export {
  USER_PORTAL_ROUTES,
  USER_PORTAL_BASE,
  OFFICER_PORTAL_ROUTES,
  CITIZEN_PORTAL_ROUTES,
  OFFICER_PORTAL_BASE,
  CITIZEN_PORTAL_BASE,
  LEGACY_DASHBOARD_BASE,
  getPortalRoutesForRole,
  getPortalBaseForRole,
  homePathForRole,
  portalBaseFromPath,
  remapLegacyDashboardPath,
  isOfficerPortalPath,
  isCitizenPortalPath,
  isUserPortalPath,
} from '@shared/constants/userPortalPaths';

export type PortalNavSection = 'main' | 'manage' | 'account';

export interface PortalNavItem {
  labelKey: string;
  path: string;
  roles: UserRole[];
  section: PortalNavSection;
}

/** Routes blocked for drivers (enforcement outcomes only — no operational AI). */
export const DRIVER_BLOCKED_ROUTE_PREFIXES: readonly string[] = [
  CITIZEN_PORTAL_ROUTES.aiDetection,
  CITIZEN_PORTAL_ROUTES.cameras,
  CITIZEN_PORTAL_ROUTES.aiLogs,
  CITIZEN_PORTAL_ROUTES.evidence,
  CITIZEN_PORTAL_ROUTES.unknownVehicles,
  CITIZEN_PORTAL_ROUTES.reports,
  CITIZEN_PORTAL_ROUTES.driverSearch,
  CITIZEN_PORTAL_ROUTES.detectionQueue,
  // Also block if somehow on officer paths
  OFFICER_PORTAL_ROUTES.aiDetection,
  OFFICER_PORTAL_ROUTES.cameras,
  OFFICER_PORTAL_ROUTES.aiLogs,
  OFFICER_PORTAL_ROUTES.evidence,
  OFFICER_PORTAL_ROUTES.unknownVehicles,
  OFFICER_PORTAL_ROUTES.reports,
  OFFICER_PORTAL_ROUTES.driverSearch,
  OFFICER_PORTAL_ROUTES.detectionQueue,
];

/** Roles allowed to run AI detection (upload, webcam, pipeline). */
export const OPERATIONAL_AI_ROLES: UserRole[] = ['admin', 'police'];

export function canAccessOperationalAi(role: UserRole | undefined | null): boolean {
  return Boolean(role && OPERATIONAL_AI_ROLES.includes(role));
}

/** Legacy nav catalog — derived from enterprise modules for compatibility. */
export const USER_PORTAL_NAV: PortalNavItem[] = getEnterpriseModulesForRole('police')
  .concat(getEnterpriseModulesForRole('driver'))
  .filter((mod, index, all) => all.findIndex((m) => m.id === mod.id && m.path === mod.path) === index)
  .map((mod) => ({
    labelKey: mod.labelKey,
    path: mod.path,
    roles: mod.roles,
    section: mod.id === 'dashboard' || mod.id === 'profile' || mod.id === 'notifications' || mod.id === 'settings'
      ? (mod.id === 'dashboard' ? 'main' : 'account')
      : 'manage',
  }));

export function getNavItemsForRole(role: UserRole): PortalNavItem[] {
  return getEnterpriseModulesForRole(role).map((mod) => ({
    labelKey: mod.labelKey,
    path: mod.path,
    roles: mod.roles,
    section: mod.id === 'dashboard'
      ? 'main'
      : (mod.id === 'notifications' || mod.id === 'profile' || mod.id === 'settings' ? 'account' : 'manage'),
  }));
}

export function getModulesForRole(role: UserRole): EnterpriseModule[] {
  return getEnterpriseModulesForRole(role);
}

export function isUserPortalRouteAllowed(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return false;

  // Domain isolation: police stays on /officer, driver on /citizen
  if (role === 'police' && pathname.startsWith('/citizen')) return false;
  if (role === 'driver' && pathname.startsWith('/officer')) return false;

  if (role === 'driver') {
    const blocked = DRIVER_BLOCKED_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (blocked) return false;
  }

  const routes = getPortalRoutesForRole(role as OperationalPortalRole);

  if (role === 'police') {
    if (pathname === routes.finesPayments || pathname === OFFICER_PORTAL_ROUTES.finesPayments) {
      return false;
    }
  }

  const modules = getEnterpriseModulesForRole(role);

  if (pathname === routes.finesPayments && role === 'driver') return true;

  return modules.some((mod) => {
    if (mod.id === 'dashboard') {
      return pathname === mod.path;
    }
    return mod.matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  });
}

export function defaultDashboardPath(role: UserRole): string {
  return homePathForRole(role);
}
