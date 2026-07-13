import { describe, expect, it } from 'vitest';
import {
  USER_PORTAL_ROUTES,
  getNavItemsForRole,
  isUserPortalRouteAllowed,
} from '@shared/constants/portalRoutes';
import { getEnterpriseModulesForRole } from '@shared/constants/enterpriseModules';

describe('portalRoutes', () => {
  it('exposes driver fines and payment paths', () => {
    expect(USER_PORTAL_ROUTES.fines).toBe('/dashboard/fines');
    expect(USER_PORTAL_ROUTES.finesPayments).toBe('/dashboard/fines/payments');
  });

  it('includes settings for drivers and officers in nav', () => {
    const driverNav = getNavItemsForRole('driver');
    const policeNav = getNavItemsForRole('police');
    expect(driverNav.some((n) => n.path === USER_PORTAL_ROUTES.settings)).toBe(true);
    expect(policeNav.some((n) => n.path === USER_PORTAL_ROUTES.settings)).toBe(true);
  });

  it('blocks officers from payment history route', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.finesPayments)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.finesPayments)).toBe(false);
  });

  it('allows officers operational AI routes', () => {
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.aiDetection)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.cameras)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.aiLogs)).toBe(true);
    expect(isUserPortalRouteAllowed('police', USER_PORTAL_ROUTES.driverSearch)).toBe(true);
  });

  it('blocks drivers from operational AI routes', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.aiDetection)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.cameras)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.aiLogs)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.evidence)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.driverSearch)).toBe(false);
  });

  it('allows drivers traffic signs, rules, and support routes', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.signs)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.trafficRules)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.support)).toBe(true);
  });

  it('keeps driver enforcement routes', () => {
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.violations)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.appeals)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.fines)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', USER_PORTAL_ROUTES.vehicles)).toBe(true);
  });

  it('uses enterprise module counts for sidebar', () => {
    expect(getEnterpriseModulesForRole('police').length).toBe(12);
    expect(getEnterpriseModulesForRole('driver').length).toBe(12);
    const driverNav = getNavItemsForRole('driver');
    expect(driverNav.some((n) => n.path === USER_PORTAL_ROUTES.aiDetection)).toBe(false);
    const policeNav = getNavItemsForRole('police');
    expect(policeNav.some((n) => n.labelKey === 'sidebar.modules.aiDetection')).toBe(true);
  });
});
