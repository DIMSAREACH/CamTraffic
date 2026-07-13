import { getNavItemsForRole, USER_PORTAL_ROUTES, type PortalNavItem } from '@shared/constants/portalRoutes';

/** Driver-only sidebar navigation entries. */
export const DRIVER_SIDEBAR_NAV: PortalNavItem[] = getNavItemsForRole('driver');

export const DRIVER_QUICK_ROUTES = {
  dashboard: USER_PORTAL_ROUTES.dashboard,
  fines: USER_PORTAL_ROUTES.fines,
  payments: USER_PORTAL_ROUTES.finesPayments,
  vehicles: USER_PORTAL_ROUTES.vehicles,
  violations: USER_PORTAL_ROUTES.violations,
  settings: USER_PORTAL_ROUTES.settings,
  profile: USER_PORTAL_ROUTES.profile,
} as const;
