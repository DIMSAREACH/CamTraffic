import { getNavItemsForRole, CITIZEN_PORTAL_ROUTES, type PortalNavItem } from '@shared/constants/portalRoutes';

/** Citizen sidebar navigation — Citizen Service domain. */
export const CITIZEN_SIDEBAR_NAV: PortalNavItem[] = getNavItemsForRole('driver');

/** @deprecated Prefer CITIZEN_SIDEBAR_NAV */
export const DRIVER_SIDEBAR_NAV = CITIZEN_SIDEBAR_NAV;

export const CITIZEN_QUICK_ROUTES = {
  dashboard: CITIZEN_PORTAL_ROUTES.dashboard,
  fines: CITIZEN_PORTAL_ROUTES.fines,
  payments: CITIZEN_PORTAL_ROUTES.finesPayments,
  vehicles: CITIZEN_PORTAL_ROUTES.vehicles,
  violations: CITIZEN_PORTAL_ROUTES.violations,
  settings: CITIZEN_PORTAL_ROUTES.settings,
  profile: CITIZEN_PORTAL_ROUTES.profile,
} as const;

/** @deprecated Prefer CITIZEN_QUICK_ROUTES */
export const DRIVER_QUICK_ROUTES = CITIZEN_QUICK_ROUTES;
