import { getNavItemsForRole, USER_PORTAL_ROUTES, type PortalNavItem } from '@shared/constants/portalRoutes';

/** Officer (police) sidebar navigation entries. */
export const POLICE_SIDEBAR_NAV: PortalNavItem[] = getNavItemsForRole('police');

export const POLICE_QUICK_ROUTES = {
  dashboard: USER_PORTAL_ROUTES.dashboard,
  aiDetection: USER_PORTAL_ROUTES.aiDetection,
  cameras: USER_PORTAL_ROUTES.cameras,
  violations: USER_PORTAL_ROUTES.violations,
  fines: USER_PORTAL_ROUTES.fines,
  reports: USER_PORTAL_ROUTES.reports,
  evidence: USER_PORTAL_ROUTES.evidence,
  profile: USER_PORTAL_ROUTES.profile,
} as const;
