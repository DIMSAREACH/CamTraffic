import { describe, expect, it } from 'vitest';
import {
  CITIZEN_PORTAL_ROUTES,
  OFFICER_PORTAL_ROUTES,
  getNavItemsForRole,
  isUserPortalRouteAllowed,
} from '@shared/constants/portalRoutes';
import { getEnterpriseModulesForRole } from '@shared/constants/enterpriseModules';

describe('portalRoutes (multi-domain)', () => {
  it('exposes citizen fines and payment paths under /citizen', () => {
    expect(CITIZEN_PORTAL_ROUTES.fines).toBe('/citizen/fines');
    expect(CITIZEN_PORTAL_ROUTES.finesPayments).toBe('/citizen/fines/payments');
  });

  it('exposes officer enforcement paths under /officer', () => {
    expect(OFFICER_PORTAL_ROUTES.aiDetection).toBe('/officer/ai-detection');
    expect(OFFICER_PORTAL_ROUTES.evidence).toBe('/officer/evidence');
  });

  it('includes settings for drivers and officers in nav', () => {
    const driverNav = getNavItemsForRole('driver');
    const policeNav = getNavItemsForRole('police');
    expect(driverNav.some((n) => n.path === CITIZEN_PORTAL_ROUTES.settings)).toBe(true);
    expect(policeNav.some((n) => n.path === OFFICER_PORTAL_ROUTES.settings)).toBe(true);
  });

  it('blocks officers from payment history route', () => {
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.finesPayments)).toBe(true);
    expect(isUserPortalRouteAllowed('police', OFFICER_PORTAL_ROUTES.finesPayments)).toBe(false);
  });

  it('allows officers operational AI routes', () => {
    expect(isUserPortalRouteAllowed('police', OFFICER_PORTAL_ROUTES.aiDetection)).toBe(true);
    expect(isUserPortalRouteAllowed('police', OFFICER_PORTAL_ROUTES.cameras)).toBe(true);
    expect(isUserPortalRouteAllowed('police', OFFICER_PORTAL_ROUTES.aiLogs)).toBe(true);
    expect(isUserPortalRouteAllowed('police', OFFICER_PORTAL_ROUTES.driverSearch)).toBe(true);
  });

  it('blocks drivers from operational AI routes', () => {
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.aiDetection)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.cameras)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', OFFICER_PORTAL_ROUTES.aiDetection)).toBe(false);
    expect(isUserPortalRouteAllowed('driver', OFFICER_PORTAL_ROUTES.evidence)).toBe(false);
  });

  it('allows drivers traffic signs, rules, and support routes', () => {
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.signs)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.trafficRules)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.support)).toBe(true);
  });

  it('keeps driver enforcement routes on /citizen', () => {
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.violations)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.appeals)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.fines)).toBe(true);
    expect(isUserPortalRouteAllowed('driver', CITIZEN_PORTAL_ROUTES.vehicles)).toBe(true);
  });

  it('isolates domains by path prefix', () => {
    expect(isUserPortalRouteAllowed('police', '/citizen')).toBe(false);
    expect(isUserPortalRouteAllowed('driver', '/officer')).toBe(false);
  });

  it('uses enterprise module counts for sidebar', () => {
    expect(getEnterpriseModulesForRole('police').length).toBe(12);
    expect(getEnterpriseModulesForRole('driver').length).toBe(12);
    const driverNav = getNavItemsForRole('driver');
    expect(driverNav.some((n) => n.path === OFFICER_PORTAL_ROUTES.aiDetection)).toBe(false);
    const policeNav = getNavItemsForRole('police');
    expect(policeNav.some((n) => n.labelKey === 'sidebar.modules.aiDetection')).toBe(true);
  });
});
