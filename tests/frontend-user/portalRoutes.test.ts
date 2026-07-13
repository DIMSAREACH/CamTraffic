import { describe, expect, it } from 'vitest';
import {
  USER_PORTAL_ROUTES,
  getNavItemsForRole,
  isUserPortalRouteAllowed,
} from '@shared/constants/portalRoutes';

describe('portalRoutes', () => {
  it('exposes driver fines and payment paths', () => {
    expect(USER_PORTAL_ROUTES.fines).toBe('/dashboard/fines');
    expect(USER_PORTAL_ROUTES.finesPayments).toBe('/dashboard/fines/payments');
  });

  it('includes settings only for drivers in nav', () => {
    const driverNav = getNavItemsForRole('driver');
    const policeNav = getNavItemsForRole('police');
    expect(driverNav.some((n) => n.path === USER_PORTAL_ROUTES.settings)).toBe(true);
    expect(policeNav.some((n) => n.path === USER_PORTAL_ROUTES.settings)).toBe(false);
  });

  it('blocks officers from payment history route', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.finesPayments)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.finesPayments)).toBe(false);
  });

  it('allows officers operational AI routes', () => {
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.aiDetection)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.cameras)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.aiLogs)).toBe(true);
  });

  it('blocks drivers from operational AI routes', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.aiDetection)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.cameras)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.aiLogs)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.evidence)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.signs)).toBe(false);
  });

  it('keeps driver enforcement routes', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.violations)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.appeals)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.fines)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.vehicles)).toBe(true);
  });

  it('hides AI detection from driver sidebar', () => {
    const driverNav = getNavItemsForRole('driver');
    expect(driverNav.some((n) => n.path === USER_PORTAL_ROUTES.aiDetection)).toBe(false);
    const policeNav = getNavItemsForRole('police');
    expect(policeNav.some((n) => n.path === USER_PORTAL_ROUTES.aiDetection)).toBe(true);
  });
});