import type { UserRole } from '@camtraffic/types';

export const USER_APP_NAME = 'CamTraffic';
export const USER_PORTAL_SUBTITLE = 'Traffic Officer & Driver Portal';
export const USER_PORTAL_ROLES: UserRole[] = ['officer', 'driver'];

export const OFFICER_PORTAL_BASE = '/officer';
export const DRIVER_PORTAL_BASE = '/driver';
export const OFFICER_DEFAULT_ROUTE = '/officer/dashboard';
export const DRIVER_DEFAULT_ROUTE = '/driver/dashboard';

export function getPortalHomeRoute(role: UserRole): string {
  return role === 'officer' ? OFFICER_DEFAULT_ROUTE : DRIVER_DEFAULT_ROUTE;
}

export function getPortalBasePath(role: UserRole): string {
  return role === 'officer' ? OFFICER_PORTAL_BASE : DRIVER_PORTAL_BASE;
}
