import { getNavItemsForRole, OFFICER_PORTAL_ROUTES, type PortalNavItem } from '@shared/constants/portalRoutes';

/** Officer sidebar navigation — Traffic Operations domain. */
export const OFFICER_SIDEBAR_NAV: PortalNavItem[] = getNavItemsForRole('police');

/** @deprecated Prefer OFFICER_SIDEBAR_NAV */
export const POLICE_SIDEBAR_NAV = OFFICER_SIDEBAR_NAV;

export const OFFICER_QUICK_ROUTES = {
  dashboard: OFFICER_PORTAL_ROUTES.dashboard,
  aiDetection: OFFICER_PORTAL_ROUTES.aiDetection,
  cameras: OFFICER_PORTAL_ROUTES.cameras,
  violations: OFFICER_PORTAL_ROUTES.violations,
  fines: OFFICER_PORTAL_ROUTES.fines,
  reports: OFFICER_PORTAL_ROUTES.reports,
  evidence: OFFICER_PORTAL_ROUTES.evidence,
  profile: OFFICER_PORTAL_ROUTES.profile,
} as const;

/** @deprecated Prefer OFFICER_QUICK_ROUTES */
export const POLICE_QUICK_ROUTES = OFFICER_QUICK_ROUTES;
